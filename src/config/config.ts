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
 * Load configuration from file or defaults, with env var overrides
 */
export async function loadConfig(): Promise<FinchConfig> {
  // TODO: Load from ~/.finch/config.json or config.yaml
  const discordToken = process.env["DISCORD_BOT_TOKEN"];
  const modelPath = process.env["FINCH_MODEL_PATH"];

  return ConfigSchema.parse({
    model: {
      path: modelPath ??
        "~/.node-llama-cpp/models/hf_Qwen_qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf",
    },
    channels: {
      discord: {
        enabled: !!discordToken,
        token: discordToken,
      },
    },
  });
}
