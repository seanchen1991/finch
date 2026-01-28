# Finch TODO / Roadmap

## In Progress

_(Items currently being worked on)_

## Planned

### Memory & History

- [ ] **Lazy load conversation history** - Load a user's history on-demand when they send their first message of the session, instead of loading all users at startup. This will improve startup time as the user base grows. _(see `src/agent/agent.ts:44`)_

- [ ] **Compact conversation history** - Currently the in-memory cache is trimmed to `maxHistoryLength`, but the SQLite database grows unbounded. Add compaction to delete old entries (e.g., trim on write, keeping last N entries per user).

### Channels

- [ ] **WhatsApp integration** - Wire up Baileys for WhatsApp support
- [ ] **Gmail integration** - Google Pub/Sub + Gmail API for push-based email
- [ ] **Outlook integration** - Microsoft Graph API webhooks

### Agent & Tools
- [ ] **Tool calling improvements** - Better error handling, streaming responses

### Skills

- [ ] **Skill loader** - Load skills from `~/.finch/skills/`
- [ ] **Learned skills** - Allow agent to define and save new tools

### Memory & Learning

- [ ] **Semantic search** - Implement embeddings-based search in memory
- [ ] **Preference learning** - Extract and store user preferences from interactions

## Completed

- [x] LLM integration with node-llama-cpp (Qwen 7B)
- [x] Discord channel (DMs + mentions)
- [x] Filesystem tools (read, write, list)
- [x] Tool calling loop
- [x] Persistent conversation history (SQLite)
- [x] Per-user conversation context across channels
- [x] Shell tool for command execution
