/**
 * Tool definition types
 */

import { z } from "zod";

/**
 * A tool that the agent can invoke
 */
export interface Tool {
  name: string;
  description: string;
  parameters: z.ZodType;
  execute: (params: unknown) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Helper to define a tool with type safety
 */
export function defineTool<T extends z.ZodType>(config: {
  name: string;
  description: string;
  parameters: T;
  execute: (params: z.infer<T>) => Promise<ToolResult>;
}): Tool {
  return {
    name: config.name,
    description: config.description,
    parameters: config.parameters,
    execute: async (params: unknown) => {
      const parsed = config.parameters.parse(params);
      return config.execute(parsed);
    },
  };
}
