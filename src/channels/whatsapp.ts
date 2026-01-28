/**
 * WhatsApp channel adapter via Baileys
 *
 * Reference: moltbot src/whatsapp/
 */

import type { Channel, IncomingMessage, OutgoingMessage, ChannelConfig } from "./types.js";

export interface WhatsAppConfig extends ChannelConfig {
  sessionPath?: string;
}

export function createWhatsAppChannel(config: WhatsAppConfig): Channel {
  let messageHandler: ((msg: IncomingMessage) => Promise<void>) | null = null;

  return {
    id: "whatsapp",
    name: "WhatsApp",

    async start() {
      // TODO: Initialize Baileys
      // Reference: moltbot src/whatsapp/
      // const { default: makeWASocket } = await import("@whiskeysockets/baileys");
      console.log("WhatsApp channel started (QR pairing required)");
    },

    async stop() {
      // TODO: Disconnect
      console.log("WhatsApp channel stopped");
    },

    async send(message: OutgoingMessage) {
      // TODO: Send via Baileys
      console.log("WhatsApp send:", message.content.slice(0, 50));
    },

    onMessage(handler) {
      messageHandler = handler;
    },
  };
}
