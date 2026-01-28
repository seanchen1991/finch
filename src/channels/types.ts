/**
 * Channel adapter interface
 */

export interface IncomingMessage {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface OutgoingMessage {
  channelId: string;
  userId: string;
  content: string;
  replyTo?: string;
}

export interface Channel {
  id: string;
  name: string;

  /** Start listening for messages */
  start(): Promise<void>;

  /** Stop listening */
  stop(): Promise<void>;

  /** Send a message */
  send(message: OutgoingMessage): Promise<void>;

  /** Show typing indicator in a channel */
  sendTyping?(channelId: string): Promise<void>;

  /** Register message handler */
  onMessage(handler: (message: IncomingMessage) => Promise<void>): void;
}

export interface ChannelConfig {
  enabled: boolean;
}
