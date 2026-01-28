/**
 * Memory system - user preferences, embeddings, history
 */

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface UserPreferences {
  tone?: string;
  topics?: string[];
  schedule?: Record<string, unknown>;
  toolPreferences?: Record<string, unknown>;
}

export interface ConversationEntry {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface Memory {
  getUserPreferences(userId: string): Promise<UserPreferences>;
  setUserPreference(userId: string, key: string, value: unknown): Promise<void>;
  recordInteraction(userId: string, input: string, output: string): Promise<void>;
  search(query: string, limit?: number): Promise<SearchResult[]>;

  // Conversation history
  getConversationHistory(userId: string): Promise<ConversationEntry[]>;
  addToConversationHistory(userId: string, role: "user" | "assistant", content: string): Promise<void>;
  clearConversationHistory(userId: string): Promise<void>;
  getAllUserIds(): Promise<string[]>;

  dispose(): Promise<void>;
}

export interface SearchResult {
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

export interface MemoryConfig {
  dbPath: string;
  embedFn?: (text: string) => Promise<number[]>;
}

/**
 * Create a memory instance backed by SQLite
 */
export async function createMemory(config: MemoryConfig): Promise<Memory> {
  // Ensure directory exists
  mkdirSync(dirname(config.dbPath), { recursive: true });

  // Initialize SQLite
  const db = new Database(config.dbPath);

  // Enable WAL mode for better concurrent performance
  db.pragma("journal_mode = WAL");

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      preferences TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS conversation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES user_preferences(user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_conversation_user_id ON conversation_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_timestamp ON conversation_history(user_id, timestamp);
  `);

  // Prepare statements
  const stmts = {
    getPrefs: db.prepare("SELECT preferences FROM user_preferences WHERE user_id = ?"),
    upsertPrefs: db.prepare(`
      INSERT INTO user_preferences (user_id, preferences) VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET preferences = excluded.preferences
    `),
    ensureUser: db.prepare(`
      INSERT OR IGNORE INTO user_preferences (user_id, preferences) VALUES (?, '{}')
    `),
    getHistory: db.prepare(`
      SELECT role, content, timestamp FROM conversation_history
      WHERE user_id = ? ORDER BY timestamp ASC
    `),
    addHistory: db.prepare(`
      INSERT INTO conversation_history (user_id, role, content, timestamp)
      VALUES (?, ?, ?, ?)
    `),
    clearHistory: db.prepare("DELETE FROM conversation_history WHERE user_id = ?"),
    getAllUserIds: db.prepare("SELECT DISTINCT user_id FROM conversation_history"),
  };

  return {
    async getUserPreferences(userId: string): Promise<UserPreferences> {
      const row = stmts.getPrefs.get(userId) as { preferences: string } | undefined;
      if (!row) return {};
      try {
        return JSON.parse(row.preferences);
      } catch {
        return {};
      }
    },

    async setUserPreference(userId: string, key: string, value: unknown): Promise<void> {
      // Get current preferences
      const row = stmts.getPrefs.get(userId) as { preferences: string } | undefined;
      let current: UserPreferences = {};
      if (row) {
        try {
          current = JSON.parse(row.preferences);
        } catch {
          // ignore parse errors
        }
      }
      (current as Record<string, unknown>)[key] = value;
      stmts.upsertPrefs.run(userId, JSON.stringify(current));
    },

    async recordInteraction(userId: string, input: string, output: string): Promise<void> {
      // For now, this is handled by addToConversationHistory
      // Future: could extract and store learned preferences here
    },

    async search(query: string, limit = 10): Promise<SearchResult[]> {
      // TODO: Implement semantic search with embeddings
      return [];
    },

    async getConversationHistory(userId: string): Promise<ConversationEntry[]> {
      const rows = stmts.getHistory.all(userId) as Array<{
        role: "user" | "assistant";
        content: string;
        timestamp: number;
      }>;
      return rows;
    },

    async addToConversationHistory(
      userId: string,
      role: "user" | "assistant",
      content: string,
    ): Promise<void> {
      // Ensure user exists in user_preferences first (for foreign key)
      stmts.ensureUser.run(userId);
      stmts.addHistory.run(userId, role, content, Date.now());
    },

    async clearConversationHistory(userId: string): Promise<void> {
      stmts.clearHistory.run(userId);
    },

    async getAllUserIds(): Promise<string[]> {
      const rows = stmts.getAllUserIds.all() as Array<{ user_id: string }>;
      return rows.map((r) => r.user_id);
    },

    async dispose(): Promise<void> {
      db.close();
    },
  };
}
