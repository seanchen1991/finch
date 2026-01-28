# Finch

A lightweight local-first AI assistant that runs on Mac Mini with Qwen models via llama.cpp.

## Project Vision

Finch is a bespoke implementation inspired by [moltbot](https://github.com/moltbot/moltbot), designed to run effectively on smaller local models. It prioritizes simplicity, local execution, and learning from user interactions.

### Goals

- Run entirely locally on Mac Mini hardware
- Use Qwen models via llama.cpp (no Ollama daemon overhead)
- Support a focused set of communication channels
- Enable coding/filesystem/OS operations
- Learn user preferences over time
- Support both pre-defined and dynamically learned skills

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Finch                                  │
├─────────────────────────────────────────────────────────────────┤
│  Channels          │  Agent Core       │  Persistence          │
│  ├─ Gmail (push)   │  ├─ llama.cpp     │  ├─ Memory (prefs)    │
│  ├─ Outlook (push) │  ├─ Tool executor │  ├─ Skills store      │
│  ├─ Discord        │  ├─ Skill loader  │  └─ Session history   │
│  └─ WhatsApp       │  └─ Context mgmt  │                       │
├─────────────────────────────────────────────────────────────────┤
│  Skills (built-in)          │  Skills (learned)                 │
│  ├─ Email handling          │  ├─ User-defined tools            │
│  ├─ Calendar management     │  └─ Agent-written tools           │
│  ├─ Contacts                │                                   │
│  └─ Filesystem/OS ops       │                                   │
├─────────────────────────────────────────────────────────────────┤
│  User Preferences (per-user)                                    │
│  ├─ Tone/style    ├─ Topics of interest    ├─ Schedules        │
│  └─ Tool preferences                                            │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Component | Technology | Notes |
|-----------|------------|-------|
| Language | TypeScript (ESM) | Strict typing, modern syntax |
| Runtime | Node.js 22+ | Also support Bun for dev |
| LLM | node-llama-cpp + Qwen GGUF | Direct llama.cpp, no Ollama |
| Discord | discord.js or raw API | Reference moltbot's implementation |
| WhatsApp | @whiskeysockets/baileys | Same as moltbot |
| Gmail | Google Pub/Sub + Gmail API | Push-based, reference moltbot hooks |
| Outlook | Microsoft Graph API | Webhooks for push notifications |
| Memory/Embeddings | SQLite + node-llama-cpp | Local vector storage |
| Config | JSON5 or YAML | User-friendly config format |

## Channels

### Gmail (Push-based)
- Uses Google Pub/Sub for real-time notifications
- Gmail API for reading/sending
- Reference: moltbot's `src/hooks/gmail*.ts`

### Outlook (Push-based)
- Microsoft Graph API webhooks for notifications
- Graph API for reading/sending
- Requires Azure AD app registration

### Discord
- Bot token authentication
- Support DMs and server channels
- Reference: moltbot's `src/discord/`

### WhatsApp
- Baileys library (web client emulation)
- QR code pairing
- Reference: moltbot's `src/whatsapp/`

## Agent Capabilities

### Core Tools (Built-in)
- **Filesystem**: Read, write, list, search files
- **Shell**: Execute commands, manage processes
- **OS APIs**: System info, notifications, clipboard

### Skills System

#### Pre-defined Skills
- Email handling (triage, reply drafts, summaries)
- Calendar management (scheduling, reminders)
- Contacts (lookup, management)

#### Learned Skills
- Agent can write new tool definitions
- User can define custom skills
- Skills stored in `~/.finch/skills/`

## Memory System

### Per-User Preferences
- **Tone/style**: How the user prefers responses
- **Topics**: Areas of interest, expertise
- **Schedules**: Working hours, availability patterns
- **Tool preferences**: Preferred apps, workflows

### Storage
- SQLite for structured data
- Embeddings for semantic search
- Session history for context

## Target Hardware

- **Primary**: Mac Mini (M1/M2/M3)
- **Models**: Qwen 2.5 7B/14B/32B (depending on RAM)
- **RAM**: 16GB minimum, 32GB+ recommended for larger models

## Project Structure

```
finch/
├── src/
│   ├── agent/           # Core agent logic, tool execution
│   ├── channels/        # Channel adapters (Discord, WhatsApp, Gmail, Outlook)
│   ├── config/          # Configuration loading and types
│   ├── llm/             # llama.cpp integration
│   ├── memory/          # Embeddings, preferences, history
│   ├── skills/          # Skill definitions and loader
│   ├── tools/           # Built-in tools (filesystem, shell, etc.)
│   └── index.ts         # Entry point
├── skills/              # Pre-defined skill files
├── test/                # Tests
├── DESIGN.md            # This file
├── CLAUDE.md            # Instructions for Claude Code
├── package.json
└── tsconfig.json
```

## Development Commands

```bash
# Install dependencies
pnpm install

# Run in development
pnpm dev

# Build
pnpm build

# Test
pnpm test

# Lint/format
pnpm lint
pnpm format
```

## References

- **moltbot**: https://github.com/moltbot/moltbot (reference implementation)
- **node-llama-cpp**: https://github.com/withcatai/node-llama-cpp
- **Baileys**: https://github.com/WhiskeySockets/Baileys
- **Microsoft Graph**: https://docs.microsoft.com/en-us/graph/
- **Gmail API**: https://developers.google.com/gmail/api

## Open Questions

1. **Model selection**: Which Qwen variant to target first? (7B for speed vs 32B for capability)
2. **Skill format**: How should learned skills be represented? (JSON schema, TypeScript, DSL?)
3. **Multi-user**: How to handle multiple users on same instance?
4. **Security**: Sandboxing for agent-executed code?

## Comparison with moltbot

| Aspect | moltbot | Finch |
|--------|---------|-------|
| LLM | Cloud APIs + Ollama | llama.cpp direct |
| Channels | 10+ (Telegram, Slack, Signal, etc.) | 4 (Gmail, Outlook, Discord, WhatsApp) |
| Skills | Plugin system | Built-in + learned |
| Memory | Embeddings | Embeddings + preference learning |
| Target | General (Pi to desktop) | Mac Mini focused |
| Codebase | ~18MB src | Minimal |
