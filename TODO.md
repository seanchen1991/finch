# Finch TODO / Roadmap

## In Progress

_(Items currently being worked on)_

## Planned

### Memory & History

- [ ] **Lazy load conversation history** - Load a user's history on-demand when they send their first message of the session, instead of loading all users at startup. This will improve startup time as the user base grows. _(see `src/agent/agent.ts:44`)_

### Channels

- [ ] **WhatsApp integration** - Wire up Baileys for WhatsApp support
- [ ] **Gmail integration** - Google Pub/Sub + Gmail API for push-based email
- [ ] **Outlook integration** - Microsoft Graph API webhooks

### Agent & Tools

- [ ] **Shell tool** - Enable the existing shell tool (`src/tools/shell.ts`) for command execution
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
