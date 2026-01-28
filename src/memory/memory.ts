/**
 * Memory system - user preferences, embeddings, history
 */

export interface UserPreferences {
  tone?: string;
  topics?: string[];
  schedule?: Record<string, unknown>;
  toolPreferences?: Record<string, unknown>;
}

export interface Memory {
  getUserPreferences(userId: string): Promise<UserPreferences>;
  setUserPreference(userId: string, key: string, value: unknown): Promise<void>;
  recordInteraction(userId: string, input: string, output: string): Promise<void>;
  search(query: string, limit?: number): Promise<SearchResult[]>;
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
  // TODO: Initialize SQLite with better-sqlite3
  // TODO: Create tables for preferences, history, embeddings

  const preferences = new Map<string, UserPreferences>();

  return {
    async getUserPreferences(userId: string): Promise<UserPreferences> {
      return preferences.get(userId) ?? {};
    },

    async setUserPreference(userId: string, key: string, value: unknown): Promise<void> {
      const prefs = preferences.get(userId) ?? {};
      (prefs as Record<string, unknown>)[key] = value;
      preferences.set(userId, prefs);
    },

    async recordInteraction(userId: string, input: string, output: string): Promise<void> {
      // TODO: Store interaction and update learned preferences
      console.log(`Recording interaction for ${userId}: ${input.slice(0, 50)}...`);
    },

    async search(query: string, limit = 10): Promise<SearchResult[]> {
      // TODO: Implement semantic search with embeddings
      return [];
    },

    async dispose(): Promise<void> {
      // TODO: Close database connection
    },
  };
}
