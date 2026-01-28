#!/usr/bin/env node

/**
 * Finch - Lightweight local-first AI assistant
 */

import "dotenv/config";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { loadConfig } from "./config/config.js";
import { createLLM } from "./llm/llm.js";
import { createMemory } from "./memory/memory.js";
import { createAgent } from "./agent/agent.js";
import { createDiscordChannel } from "./channels/discord.js";
import { filesystemTools } from "./tools/filesystem.js";
import { shellTools } from "./tools/shell.js";
import type { Channel } from "./channels/types.js";

function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    return resolve(homedir(), path.slice(2));
  }
  return resolve(path);
}

async function main() {
  console.log("Finch v0.0.1\n");

  const config = await loadConfig();
  const modelPath = expandPath(config.model.path);

  // Check if we're in CLI test mode (argument provided) or server mode
  const cliPrompt = process.argv[2];

  console.log("Loading model:", modelPath);
  const llm = await createLLM({
    modelPath,
    contextSize: config.model.contextSize,
    gpuLayers: config.model.gpuLayers,
  });
  console.log("Model loaded!\n");

  // CLI test mode - also uses agent with tools
  if (cliPrompt) {
    const memory = await createMemory({
      dbPath: expandPath(config.memory.path),
    });

    const agent = createAgent({
      llm,
      tools: [...filesystemTools, ...shellTools],
      memory,
      systemPrompt: "You are Finch, a helpful AI assistant running on the user's local machine. Be concise and friendly. You have access to the filesystem - use it when the user asks about files.",
    });

    // Load conversation history from database
    await agent.loadHistory();

    console.log("User:", cliPrompt);
    console.log("Assistant:", "");

    const response = await agent.chat(cliPrompt, "cli-user");

    console.log(response);
    await memory.dispose();
    await llm.dispose();
    return;
  }

  // Server mode - start channels
  const memory = await createMemory({
    dbPath: expandPath(config.memory.path),
  });

  const agent = createAgent({
    llm,
    tools: [...filesystemTools, ...shellTools],
    memory,
    systemPrompt: "You are Finch, a helpful AI assistant running on the user's local machine. Be concise and friendly. You have access to the filesystem - use it when the user asks about files.",
  });

  // Load conversation history from database
  await agent.loadHistory();

  const channels: Channel[] = [];

  // Discord
  if (config.channels.discord.enabled) {
    const discord = createDiscordChannel({
      enabled: true,
      token: config.channels.discord.token,
    });

    discord.onMessage(async (msg) => {
      console.log(`[Discord] ${msg.metadata?.["username"]}: ${msg.content}`);

      try {
        const response = await agent.chat(msg.content, msg.userId);
        await discord.send({
          channelId: msg.channelId,
          userId: msg.userId,
          content: response,
          replyTo: msg.id,
        });
      } catch (err) {
        console.error("Error handling message:", err);
        await discord.send({
          channelId: msg.channelId,
          userId: msg.userId,
          content: "Sorry, I encountered an error processing your message.",
          replyTo: msg.id,
        });
      }
    });

    channels.push(discord);
  }

  if (channels.length === 0) {
    console.log("No channels enabled. Set DISCORD_BOT_TOKEN to enable Discord.");
    console.log("Exiting...");
    await llm.dispose();
    return;
  }

  // Start all channels
  for (const channel of channels) {
    await channel.start();
  }

  console.log(`\nFinch is running with ${channels.length} channel(s). Press Ctrl+C to stop.\n`);

  // Handle shutdown
  const shutdown = async () => {
    console.log("\nShutting down...");
    for (const channel of channels) {
      await channel.stop();
    }
    await memory.dispose();
    await llm.dispose();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
