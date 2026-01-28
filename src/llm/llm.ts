/**
 * LLM integration via node-llama-cpp
 */

import {
  getLlama,
  LlamaChatSession,
  type LlamaModel,
  type LlamaContext,
  type LlamaEmbeddingContext,
} from "node-llama-cpp";

export interface LLMConfig {
  modelPath: string;
  contextSize?: number;
  gpuLayers?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLM {
  chat(messages: ChatMessage[]): Promise<string>;
  embed(text: string): Promise<number[]>;
  dispose(): Promise<void>;
}

/**
 * Create an LLM instance using node-llama-cpp
 */
export async function createLLM(config: LLMConfig): Promise<LLM> {
  const llama = await getLlama();

  const model: LlamaModel = await llama.loadModel({
    modelPath: config.modelPath,
    gpuLayers: config.gpuLayers,
  });

  const context: LlamaContext = await model.createContext({
    contextSize: config.contextSize ?? 8192,
  });

  // Lazily create embedding context only when needed
  let embeddingContext: LlamaEmbeddingContext | null = null;

  async function getEmbeddingContext(): Promise<LlamaEmbeddingContext> {
    if (!embeddingContext) {
      embeddingContext = await model.createEmbeddingContext();
    }
    return embeddingContext;
  }

  return {
    async chat(messages: ChatMessage[]): Promise<string> {
      // Extract system prompt from messages
      const systemMessage = messages.find((m) => m.role === "system");
      const systemPrompt = systemMessage?.content ?? "You are a helpful assistant.";

      // Create a fresh session for each call
      const session = new LlamaChatSession({
        contextSequence: context.getSequence(),
        systemPrompt,
      });

      // Get the last user message
      const userMessages = messages.filter((m) => m.role === "user");
      const lastUserMessage = userMessages[userMessages.length - 1];
      if (!lastUserMessage) {
        throw new Error("No user message provided");
      }

      const response = await session.prompt(lastUserMessage.content);
      return response;
    },

    async embed(text: string): Promise<number[]> {
      const ctx = await getEmbeddingContext();
      const embedding = await ctx.getEmbeddingFor(text);
      return Array.from(embedding.vector);
    },

    async dispose(): Promise<void> {
      if (embeddingContext) {
        await embeddingContext.dispose();
      }
      await context.dispose();
      await model.dispose();
    },
  };
}
