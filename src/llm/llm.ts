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

export type StreamCallback = (chunk: string) => void;

export interface LLM {
  chat(messages: ChatMessage[]): Promise<string>;
  chatStream(messages: ChatMessage[], onChunk: StreamCallback): Promise<string>;
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
      // Create a fresh context for each call to avoid sequence exhaustion
      const context: LlamaContext = await model.createContext({
        contextSize: config.contextSize ?? 8192,
      });

      try {
        // Extract system prompt from messages
        const systemMessage = messages.find((m) => m.role === "system");
        const systemPrompt = systemMessage?.content ?? "You are a helpful assistant.";

        // Create a fresh session
        const session = new LlamaChatSession({
          contextSequence: context.getSequence(),
          systemPrompt,
        });

        // Build conversation by feeding all non-system messages
        const conversationMessages = messages.filter((m) => m.role !== "system");

        // Process all messages except the last user message
        for (let i = 0; i < conversationMessages.length - 1; i += 2) {
          const userMsg = conversationMessages[i];
          const assistantMsg = conversationMessages[i + 1];

          if (userMsg?.role === "user" && assistantMsg?.role === "assistant") {
            // Feed the conversation history
            await session.prompt(userMsg.content);
            // The session should have the assistant response in history now
          }
        }

        // Get the last user message for the actual response
        const lastMessage = conversationMessages[conversationMessages.length - 1];
        if (!lastMessage || lastMessage.role !== "user") {
          throw new Error("Last message must be from user");
        }

        const response = await session.prompt(lastMessage.content);
        return response;
      } finally {
        await context.dispose();
      }
    },

    async chatStream(messages: ChatMessage[], onChunk: StreamCallback): Promise<string> {
      // Create a fresh context for each call to avoid sequence exhaustion
      const context: LlamaContext = await model.createContext({
        contextSize: config.contextSize ?? 8192,
      });

      try {
        // Extract system prompt from messages
        const systemMessage = messages.find((m) => m.role === "system");
        const systemPrompt = systemMessage?.content ?? "You are a helpful assistant.";

        // Create a fresh session
        const session = new LlamaChatSession({
          contextSequence: context.getSequence(),
          systemPrompt,
        });

        // Build conversation by feeding all non-system messages
        const conversationMessages = messages.filter((m) => m.role !== "system");

        // Process all messages except the last user message
        for (let i = 0; i < conversationMessages.length - 1; i += 2) {
          const userMsg = conversationMessages[i];
          const assistantMsg = conversationMessages[i + 1];

          if (userMsg?.role === "user" && assistantMsg?.role === "assistant") {
            await session.prompt(userMsg.content);
          }
        }

        // Get the last user message for the actual response
        const lastMessage = conversationMessages[conversationMessages.length - 1];
        if (!lastMessage || lastMessage.role !== "user") {
          throw new Error("Last message must be from user");
        }

        const response = await session.prompt(lastMessage.content, {
          onTextChunk: (chunk) => {
            onChunk(chunk);
          },
        });
        return response;
      } finally {
        await context.dispose();
      }
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
      await model.dispose();
    },
  };
}
