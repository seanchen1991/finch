/**
 * Core agent logic - orchestrates LLM, tools, and skills
 */

import type { LLM, ChatMessage } from "../llm/llm.js";
import type { Tool } from "../tools/types.js";
import type { Memory, UserPreferences } from "../memory/memory.js";
import { zodToJsonSchema } from "../tools/schema.js";

export interface AgentConfig {
  llm: LLM;
  tools: Tool[];
  memory: Memory;
  systemPrompt?: string;
  maxToolCalls?: number;
}

export interface Agent {
  chat(userMessage: string, userId: string): Promise<string>;
  addTool(tool: Tool): void;
}

interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Create an agent instance
 */
export function createAgent(config: AgentConfig): Agent {
  const { llm, tools, memory } = config;
  const maxToolCalls = config.maxToolCalls ?? 10;
  const toolRegistry = new Map(tools.map((t) => [t.name, t]));

  return {
    async chat(userMessage: string, userId: string): Promise<string> {
      // Load user preferences from memory
      const prefs = await memory.getUserPreferences(userId);

      // Build initial messages
      const messages: ChatMessage[] = [
        {
          role: "system",
          content: buildSystemPrompt(config.systemPrompt, prefs, toolRegistry),
        },
        { role: "user", content: userMessage },
      ];

      // Tool calling loop
      let iterations = 0;
      while (iterations < maxToolCalls) {
        iterations++;

        const response = await llm.chat(messages);

        // Try to parse tool calls from response
        const toolCalls = parseToolCalls(response);

        if (toolCalls.length === 0) {
          // No tool calls - return the response
          return cleanResponse(response);
        }

        // Execute tool calls
        const results: string[] = [];
        for (const call of toolCalls) {

          const tool = toolRegistry.get(call.name);
          if (!tool) {
            results.push(`Error: Unknown tool "${call.name}"`);
            continue;
          }

          try {
            const result = await tool.execute(call.arguments);
            if (result.success) {
              results.push(`[${call.name}] ${result.output}`);
            } else {
              results.push(`[${call.name}] Error: ${result.error}`);
            }
          } catch (err) {
            results.push(`[${call.name}] Error: ${String(err)}`);
          }
        }

        // Add assistant response and tool results to history
        messages.push({ role: "assistant", content: response });
        messages.push({
          role: "user",
          content: `Tool results:\n${results.join("\n\n")}\n\nContinue your response based on these results.`,
        });
      }

      // Max iterations reached
      const finalResponse = await llm.chat(messages);
      return cleanResponse(finalResponse);
    },

    addTool(tool: Tool): void {
      toolRegistry.set(tool.name, tool);
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
