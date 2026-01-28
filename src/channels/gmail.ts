/**
 * Gmail channel adapter via Google Pub/Sub
 *
 * Reference: moltbot src/hooks/gmail*.ts
 */

import type { Channel, IncomingMessage, OutgoingMessage, ChannelConfig } from "./types.js";

export interface GmailConfig extends ChannelConfig {
  account?: string;
  topic?: string;
  pushToken?: string;
}

export function createGmailChannel(config: GmailConfig): Channel {
  let messageHandler: ((msg: IncomingMessage) => Promise<void>) | null = null;

  return {
    id: "gmail",
    name: "Gmail",

    async start() {
      if (!config.account) {
        throw new Error("Gmail account required");
      }
      // TODO: Set up Pub/Sub listener
      // TODO: Watch for new emails via Gmail API
      // Reference: moltbot src/hooks/gmail-watcher.ts
      console.log("Gmail channel started for", config.account);
    },

    async stop() {
      // TODO: Stop watch
      console.log("Gmail channel stopped");
    },

    async send(message: OutgoingMessage) {
      // TODO: Send email via Gmail API
      console.log("Gmail send:", message.content.slice(0, 50));
    },

    onMessage(handler) {
      messageHandler = handler;
    },
  };
}
