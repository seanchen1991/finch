/**
 * Discord channel adapter
 */

import {
  Client,
  GatewayIntentBits,
  Partials,
  type Message,
  type TextChannel,
  type DMChannel,
} from "discord.js";
import type { Channel, IncomingMessage, OutgoingMessage, ChannelConfig } from "./types.js";

export interface DiscordConfig extends ChannelConfig {
  token?: string;
}

export function createDiscordChannel(config: DiscordConfig): Channel {
  let messageHandler: ((msg: IncomingMessage) => Promise<void>) | null = null;
  let client: Client | null = null;
  let botUserId: string | null = null;

  return {
    id: "discord",
    name: "Discord",

    async start() {
      if (!config.token) {
        throw new Error("Discord token required");
      }

      client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.DirectMessages,
          GatewayIntentBits.MessageContent,
        ],
        partials: [Partials.Channel], // Required for DMs
      });

      client.on("messageCreate", async (message: Message) => {
        // Ignore bot messages
        if (message.author.bot) return;

        // Check if this is a DM or a mention
        const isDM = message.channel.isDMBased();
        const isMentioned = botUserId && message.mentions.has(botUserId);

        if (!isDM && !isMentioned) return;

        // Strip mention from content if present
        let content = message.content;
        if (isMentioned && botUserId) {
          content = content.replace(new RegExp(`<@!?${botUserId}>\\s*`, "g"), "").trim();
        }

        if (!content) return;

        const incoming: IncomingMessage = {
          id: message.id,
          channelId: message.channelId,
          userId: message.author.id,
          content,
          timestamp: message.createdAt,
          metadata: {
            username: message.author.username,
            guildId: message.guildId,
            isDM,
          },
        };

        if (messageHandler) {
          await messageHandler(incoming);
        }
      });

      client.once("ready", () => {
        botUserId = client?.user?.id ?? null;
        console.log(`Discord connected as ${client?.user?.tag}`);
      });

      await client.login(config.token);
    },

    async stop() {
      if (client) {
        client.destroy();
        client = null;
      }
      console.log("Discord channel stopped");
    },

    async send(message: OutgoingMessage) {
      if (!client) {
        throw new Error("Discord client not connected");
      }

      const channel = await client.channels.fetch(message.channelId);
      if (!channel) {
        throw new Error(`Channel ${message.channelId} not found`);
      }

      if (!channel.isTextBased()) {
        throw new Error(`Channel ${message.channelId} is not text-based`);
      }

      const textChannel = channel as TextChannel | DMChannel;

      // Split long messages (Discord limit is 2000 chars)
      const chunks = splitMessage(message.content, 2000);
      for (const chunk of chunks) {
        if (message.replyTo) {
          try {
            const replyMessage = await textChannel.messages.fetch(message.replyTo);
            await replyMessage.reply(chunk);
          } catch {
            // Fall back to regular send if reply fails
            await textChannel.send(chunk);
          }
        } else {
          await textChannel.send(chunk);
        }
      }
    },

    onMessage(handler) {
      messageHandler = handler;
    },
  };
}

function splitMessage(content: string, maxLength: number): string[] {
  if (content.length <= maxLength) return [content];

  const chunks: string[] = [];
  let remaining = content;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Try to split at newline
    let splitIndex = remaining.lastIndexOf("\n", maxLength);
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      // Try to split at space
      splitIndex = remaining.lastIndexOf(" ", maxLength);
    }
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      // Hard split
      splitIndex = maxLength;
    }

    chunks.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex).trimStart();
  }

  return chunks;
}
