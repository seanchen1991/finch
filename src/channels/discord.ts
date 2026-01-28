/**
 * Discord channel adapter
 *
 * Reference: moltbot src/discord/
 */

import type { Channel, IncomingMessage, OutgoingMessage, ChannelConfig } from "./types.js";

export interface DiscordConfig extends ChannelConfig {
  token?: string;
}

export function createDiscordChannel(config: DiscordConfig): Channel {
  let messageHandler: ((msg: IncomingMessage) => Promise<void>) | null = null;

  return {
    id: "discord",
    name: "Discord",

    async start() {
      if (!config.token) {
        throw new Error("Discord token required");
      }
      // TODO: Initialize discord.js client
      // Reference: moltbot src/discord/monitor.ts
      console.log("Discord channel started");
    },

    async stop() {
      // TODO: Disconnect client
      console.log("Discord channel stopped");
    },

    async send(message: OutgoingMessage) {
      // TODO: Send via discord.js
      console.log("Discord send:", message.content.slice(0, 50));
    },

    onMessage(handler) {
      messageHandler = handler;
    },
  };
}
