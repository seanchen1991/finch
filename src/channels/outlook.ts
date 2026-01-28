/**
 * Outlook channel adapter via Microsoft Graph API
 *
 * Uses Graph API webhooks for push notifications
 * https://docs.microsoft.com/en-us/graph/api/subscription-post-subscriptions
 */

import type { Channel, IncomingMessage, OutgoingMessage, ChannelConfig } from "./types.js";

export interface OutlookConfig extends ChannelConfig {
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  userEmail?: string;
}

export function createOutlookChannel(config: OutlookConfig): Channel {
  let messageHandler: ((msg: IncomingMessage) => Promise<void>) | null = null;

  return {
    id: "outlook",
    name: "Outlook",

    async start() {
      if (!config.clientId) {
        throw new Error("Outlook clientId required (Azure AD app)");
      }
      // TODO: Authenticate with MSAL
      // TODO: Create Graph API subscription for mail notifications
      // https://docs.microsoft.com/en-us/graph/webhooks
      console.log("Outlook channel started");
    },

    async stop() {
      // TODO: Delete subscription
      console.log("Outlook channel stopped");
    },

    async send(message: OutgoingMessage) {
      // TODO: Send email via Graph API
      // POST /me/sendMail
      console.log("Outlook send:", message.content.slice(0, 50));
    },

    onMessage(handler) {
      messageHandler = handler;
    },
  };
}
