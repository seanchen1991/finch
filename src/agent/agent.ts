/**
 * Core agent logic - orchestrates LLM, tools, and skills
 */

import type { LLM, ChatMessage } from "../llm/llm.js";
import type { Tool } from "../tools/types.js";
import type { Memory } from "../memory/memory.js";

export interface AgentConfig {
  llm: LLM;
  tools: Tool[];
  memory: Memory;
  systemPrompt?: string;
}

export interface Agent {
  chat(userMessage: string, userId: string): Promise<string>;
  addTool(tool: Tool): void;
}

/**
 * Create an agent instance
 */
export function createAgent(config: AgentConfig): Agent {
  const { llm, tools, memory } = config;
  const toolRegistry = new Map(tools.map((t) => [t.name, t]));

  return {
    async chat(userMessage: string, userId: string): Promise<string> {
      // Load user preferences from memory
      const prefs = await memory.getUserPreferences(userId);

      // Build message history
      const messages: ChatMessage[] = [
        {
          role: "system",
          content: buildSystemPrompt(config.systemPrompt, prefs, toolRegistry),
        },
        { role: "user", content: userMessage },
      ];

      // TODO: Implement tool calling loop
      const response = await llm.chat(messages);

      // TODO: Learn from interaction
      // await memory.recordInteraction(userId, userMessage, response);

      return response;
    },

    addTool(tool: Tool): void {
      toolRegistry.set(tool.name, tool);
    },
  };
}

function buildSystemPrompt(
  base: string | undefined,
  prefs: Record<string, unknown>,
  tools: Map<string, Tool>,
): string {
  const toolDescriptions = Array.from(tools.values())
    .map((t) => `- ${t.name}: ${t.description}`)
    .join("\n");

  return `${base ?? "You are Finch, a helpful AI assistant."}

## Available Tools
${toolDescriptions}

## User Preferences
${JSON.stringify(prefs, null, 2)}
`;
}
