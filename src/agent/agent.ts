/**
 * Core agent logic - orchestrates LLM, tools, and skills
 */

import type { LLM, ChatMessage, StreamCallback } from "../llm/llm.js";
import type { Tool } from "../tools/types.js";
import type { Memory, UserPreferences, ConversationEntry } from "../memory/memory.js";
import { zodToJsonSchema } from "../tools/schema.js";

export interface AgentConfig {
  llm: LLM;
  tools: Tool[];
  memory: Memory;
  systemPrompt?: string;
  maxToolCalls?: number;
  maxHistoryLength?: number;
}

export interface StreamOptions {
  /** Called for each text chunk (excludes tool call markup) */
  onChunk?: StreamCallback;
  /** Called when a tool is being executed */
  onToolCall?: (toolName: string) => void;
}

export interface Agent {
  chat(userMessage: string, userId: string, options?: StreamOptions): Promise<string>;
  addTool(tool: Tool): void;
  clearHistory(userId: string): Promise<void>;
  loadHistory(): Promise<void>;
}

interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

/** Categorized tool execution errors for better feedback to the model */
enum ToolErrorType {
  UnknownTool = "unknown_tool",
  InvalidArguments = "invalid_arguments",
  ExecutionFailed = "execution_failed",
  Timeout = "timeout",
}

interface ToolExecutionError {
  type: ToolErrorType;
  toolName: string;
  message: string;
  details?: string;
}

function formatToolError(error: ToolExecutionError, availableTools?: string[]): string {
  switch (error.type) {
    case ToolErrorType.UnknownTool:
      const toolList = availableTools?.length
        ? `Available tools: ${availableTools.join(", ")}`
        : "";
      return `Error: Unknown tool "${error.toolName}". ${toolList}`;

    case ToolErrorType.InvalidArguments:
      return `Error: Invalid arguments for "${error.toolName}": ${error.message}${
        error.details ? `\nDetails: ${error.details}` : ""
      }`;

    case ToolErrorType.ExecutionFailed:
      return `Error: Tool "${error.toolName}" failed: ${error.message}`;

    case ToolErrorType.Timeout:
      return `Error: Tool "${error.toolName}" timed out after ${error.details ?? "unknown"} ms`;

    default:
      return `Error: ${error.message}`;
  }
}

/**
 * Create an agent instance
 */
export function createAgent(config: AgentConfig): Agent {
  const { llm, tools, memory } = config;
  const maxToolCalls = config.maxToolCalls ?? 10;
  const maxHistoryLength = config.maxHistoryLength ?? 20; // Max conversation turns to keep
  const toolRegistry = new Map(tools.map((t) => [t.name, t]));

  // In-memory cache of conversation history (loaded from DB on startup)
  const historyCache = new Map<string, ConversationEntry[]>();

  return {
    async loadHistory(): Promise<void> {
      // TODO: Lazy loading optimization - instead of loading all users upfront,
      // load a user's history on-demand when they send their first message of the session.
      // This will improve startup time as the user base grows.

      // Load all users' conversation history from database
      const userIds = await memory.getAllUserIds();
      for (const userId of userIds) {
        const history = await memory.getConversationHistory(userId);
        // Trim to max length
        const trimmed = history.slice(-maxHistoryLength * 2);
        historyCache.set(userId, trimmed);
      }
      if (userIds.length > 0) {
        console.log(`Loaded conversation history for ${userIds.length} user(s)`);
      }
    },

    async chat(userMessage: string, userId: string, options?: StreamOptions): Promise<string> {
      const { onChunk, onToolCall } = options ?? {};

      // Load user preferences from memory
      const prefs = await memory.getUserPreferences(userId);

      // Get conversation history for this user (from cache)
      const history = historyCache.get(userId) ?? [];

      // Build messages with history
      const messages: ChatMessage[] = [
        {
          role: "system",
          content: buildSystemPrompt(config.systemPrompt, prefs, toolRegistry),
        },
        // Include conversation history
        ...history.map((entry) => ({
          role: entry.role,
          content: entry.content,
        })),
        // Add current user message
        { role: "user", content: userMessage },
      ];

      // Prepare cache reference (don't save yet - wait for successful response)
      if (!historyCache.has(userId)) {
        historyCache.set(userId, []);
      }
      const cached = historyCache.get(userId)!;

      // Helper to save both user and assistant messages after successful response
      const saveToHistory = async (assistantResponse: string) => {
        const now = Date.now();
        cached.push({ role: "user", content: userMessage, timestamp: now });
        cached.push({ role: "assistant", content: assistantResponse, timestamp: now });
        await memory.addToConversationHistory(userId, "user", userMessage);
        await memory.addToConversationHistory(userId, "assistant", assistantResponse);

        // Trim cache if needed
        while (cached.length > maxHistoryLength * 2) {
          cached.shift();
        }
      };

      // Tool calling loop
      let iterations = 0;
      let isFirstResponse = true;

      while (iterations < maxToolCalls) {
        iterations++;

        let response: string;

        // Use streaming for the first response if callback provided and we might not need tools
        // For subsequent responses (after tool execution), also use streaming
        if (onChunk) {
          let buffer = "";
          let toolCallDetected = false;

          response = await llm.chatStream(messages, (chunk) => {
            buffer += chunk;
            // Check if we're entering a tool call
            if (buffer.includes("<tool_call>") && !toolCallDetected) {
              toolCallDetected = true;
              // Stream everything before the tool call tag
              const beforeToolCall = buffer.split("<tool_call>")[0];
              if (beforeToolCall && isFirstResponse) {
                onChunk(beforeToolCall);
              }
            }
            // Only stream if we haven't detected a tool call
            if (!toolCallDetected && isFirstResponse) {
              onChunk(chunk);
            }
          });
        } else {
          response = await llm.chat(messages);
        }

        // Try to parse tool calls from response
        const toolCalls = parseToolCalls(response);

        if (toolCalls.length === 0) {
          // No tool calls - save to history and return
          const cleaned = cleanResponse(response);
          await saveToHistory(cleaned);
          return cleaned;
        }

        isFirstResponse = false;

        // Execute tool calls
        const results: string[] = [];
        const availableToolNames = Array.from(toolRegistry.keys());

        for (const call of toolCalls) {
          const tool = toolRegistry.get(call.name);

          // Notify about tool call
          if (onToolCall) {
            onToolCall(call.name);
          }

          // Handle unknown tool
          if (!tool) {
            const error: ToolExecutionError = {
              type: ToolErrorType.UnknownTool,
              toolName: call.name,
              message: `Tool "${call.name}" does not exist`,
            };
            results.push(formatToolError(error, availableToolNames));
            continue;
          }

          try {
            const result = await tool.execute(call.arguments);
            if (result.success) {
              results.push(`[${call.name}] ${result.output}`);
            } else {
              const error: ToolExecutionError = {
                type: ToolErrorType.ExecutionFailed,
                toolName: call.name,
                message: result.error ?? "Unknown error",
              };
              results.push(formatToolError(error));
            }
          } catch (err) {
            // Check for Zod validation errors
            if (err instanceof Error && err.name === "ZodError") {
              const zodError = err as Error & { issues?: Array<{ path: string[]; message: string }> };
              const details = zodError.issues
                ?.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; ");
              const error: ToolExecutionError = {
                type: ToolErrorType.InvalidArguments,
                toolName: call.name,
                message: "Validation failed",
                details,
              };
              results.push(formatToolError(error));
            } else if (err instanceof Error && err.message?.includes("timed out")) {
              const error: ToolExecutionError = {
                type: ToolErrorType.Timeout,
                toolName: call.name,
                message: "Command timed out",
                details: "30000", // Default timeout
              };
              results.push(formatToolError(error));
            } else {
              const error: ToolExecutionError = {
                type: ToolErrorType.ExecutionFailed,
                toolName: call.name,
                message: err instanceof Error ? err.message : String(err),
              };
              results.push(formatToolError(error));
            }
          }
        }

        // Check if any errors occurred
        const hasErrors = results.some((r) => r.startsWith("Error:"));

        // Add assistant response and tool results to history
        messages.push({ role: "assistant", content: response });

        let feedbackMessage = `Tool results:\n${results.join("\n\n")}`;
        if (hasErrors) {
          feedbackMessage += "\n\nSome tool calls failed. You may retry with corrected arguments, try a different approach, or explain the issue to the user.";
        } else {
          feedbackMessage += "\n\nContinue your response based on these results.";
        }

        messages.push({
          role: "user",
          content: feedbackMessage,
        });
      }

      // Max iterations reached
      const finalResponse = await llm.chat(messages);
      const cleaned = cleanResponse(finalResponse);
      await saveToHistory(cleaned);
      return cleaned;
    },

    addTool(tool: Tool): void {
      toolRegistry.set(tool.name, tool);
    },

    async clearHistory(userId: string): Promise<void> {
      historyCache.delete(userId);
      await memory.clearConversationHistory(userId);
    },
  };
}

/**
 * Parse tool calls from LLM response
 * Supports formats:
 * - <tool_call>{"name": "...", "arguments": {...}}</tool_call>
 * - <tool_call>{"name": "...", "arguments": {...}} (unclosed)
 * - ```json\n{"tool_calls": [...]}```
 */
function parseToolCalls(response: string): ToolCall[] {
  const calls: ToolCall[] = [];

  // Format 1a: <tool_call> tags with closing tag
  const toolCallClosedRegex = /<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/g;
  let match;
  while ((match = toolCallClosedRegex.exec(response)) !== null) {
    const jsonStr = match[1];
    if (!jsonStr) continue;
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.name && typeof parsed.arguments === "object") {
        calls.push({ name: parsed.name, arguments: parsed.arguments });
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  if (calls.length > 0) return calls;

  // Format 1b: <tool_call> tags without closing tag (model may not close them)
  const toolCallOpenRegex = /<tool_call>\s*(\{[\s\S]*\})/g;
  while ((match = toolCallOpenRegex.exec(response)) !== null) {
    const jsonStr = match[1];
    if (!jsonStr) continue;
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.name && typeof parsed.arguments === "object") {
        calls.push({ name: parsed.name, arguments: parsed.arguments });
      }
    } catch {
      // Try to find valid JSON within the match (greedy regex may grab too much)
      const innerMatch = jsonStr.match(/^\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
      if (innerMatch) {
        try {
          const parsed = JSON.parse(innerMatch[0]);
          if (parsed.name && typeof parsed.arguments === "object") {
            calls.push({ name: parsed.name, arguments: parsed.arguments });
          }
        } catch {
          // Invalid JSON, skip
        }
      }
    }
  }

  if (calls.length > 0) return calls;

  // Format 2: JSON code block with tool_calls array
  const jsonBlockRegex = /```json\s*(\{[\s\S]*?\})\s*```/g;
  while ((match = jsonBlockRegex.exec(response)) !== null) {
    const jsonStr = match[1];
    if (!jsonStr) continue;
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.tool_calls)) {
        for (const call of parsed.tool_calls) {
          if (call.name && typeof call.arguments === "object") {
            calls.push({ name: call.name, arguments: call.arguments });
          }
        }
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  return calls;
}

/**
 * Clean up response by removing tool call markup
 */
function cleanResponse(response: string): string {
  return response
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "")
    .replace(/<tool_call>[\s\S]*$/g, "") // Handle unclosed tags at end
    .replace(/```json\s*\{[\s\S]*?"tool_calls"[\s\S]*?\}\s*```/g, "")
    .trim();
}

function buildSystemPrompt(
  base: string | undefined,
  prefs: UserPreferences,
  tools: Map<string, Tool>,
): string {
  const basePrompt = base ?? "You are Finch, a helpful AI assistant.";

  if (tools.size === 0) {
    return basePrompt;
  }

  const toolSchemas = Array.from(tools.values()).map((t) => ({
    name: t.name,
    description: t.description,
    parameters: zodToJsonSchema(t.parameters),
  }));

  const toolsJson = JSON.stringify(toolSchemas, null, 2);

  return `${basePrompt}

## Tools

You have access to the following tools:

${toolsJson}

To use a tool, include a tool call in your response using this format:
<tool_call>{"name": "tool_name", "arguments": {"param": "value"}}</tool_call>

You can make multiple tool calls in one response. After tool results are provided, continue your response.

Only use tools when necessary to answer the user's question. If you can answer without tools, do so directly.
`;
}
