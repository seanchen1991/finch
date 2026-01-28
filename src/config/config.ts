import { z } from "zod";

/**
 * Finch configuration schema
 */
export const ConfigSchema = z.object({
  model: z.object({
    path: z.string().describe("Path to GGUF model file"),
    contextSize: z.number().default(8192),
    gpuLayers: z.number().default(0).describe("Number of layers to offload to GPU"),
  }),
  channels: z.object({
    discord: z.object({
      enabled: z.boolean().default(false),
      token: z.string().optional(),
    }).default({}),
    whatsapp: z.object({
      enabled: z.boolean().default(false),
    }).default({}),
    gmail: z.object({
      enabled: z.boolean().default(false),
      account: z.string().optional(),
    }).default({}),
    outlook: z.object({
      enabled: z.boolean().default(false),
      clientId: z.string().optional(),
    }).default({}),
  }).default({}),
  memory: z.object({
    path: z.string().default("~/.finch/memory.db"),
  }).default({}),
  skills: z.object({
    path: z.string().default("~/.finch/skills"),
  }).default({}),
});

export type FinchConfig = z.infer<typeof ConfigSchema>;

/**
 * Load configuration from file or defaults
 */
export async function loadConfig(): Promise<FinchConfig> {
  // TODO: Load from ~/.finch/config.json or config.yaml
  // For now, return defaults with placeholder model path
  return ConfigSchema.parse({
    model: {
      path: "~/.finch/models/qwen2.5-7b-instruct.gguf",
    },
  });
}
