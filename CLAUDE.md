# Finch - Claude Code Instructions

## Project Overview

Finch is a lightweight local-first AI assistant targeting Mac Mini with Qwen models via llama.cpp.

See `DESIGN.md` for full architecture and design decisions.

## Quick Reference

- **Language**: TypeScript (ESM), strict mode
- **Runtime**: Node.js 22+ (Bun supported for dev)
- **Package manager**: pnpm
- **LLM**: node-llama-cpp with Qwen GGUF models
- **Channels**: Gmail, Outlook, Discord, WhatsApp

## Development Commands

```bash
pnpm install      # Install dependencies
pnpm dev          # Run in development
pnpm build        # Build (tsc)
pnpm test         # Run tests (vitest)
pnpm lint         # Lint (oxlint)
pnpm format       # Format (oxfmt)
```

## Code Style

- Prefer strict typing; avoid `any`
- Keep files concise (~500 LOC guideline)
- Add brief comments for tricky/non-obvious logic
- Use existing patterns; don't over-engineer
- ESM imports only (no CommonJS)

## Project Structure

```
src/
├── agent/        # Core agent logic, tool execution
├── channels/     # Channel adapters
├── config/       # Configuration
├── llm/          # llama.cpp integration
├── memory/       # Embeddings, preferences
├── skills/       # Skill loader
├── tools/        # Built-in tools
└── index.ts      # Entry point
```

## Reference Material

When implementing features, refer to moltbot's codebase at `~/Projects/moltbot`:

| Feature | moltbot Reference |
|---------|-------------------|
| Discord | `src/discord/` |
| WhatsApp | `src/whatsapp/` |
| Gmail hooks | `src/hooks/gmail*.ts` |
| Channel plugin interface | `src/channels/plugins/types.ts` |
| Config system | `src/config/` |
| Memory/embeddings | `src/memory/` |

## Key Dependencies

- `node-llama-cpp` - llama.cpp bindings
- `@whiskeysockets/baileys` - WhatsApp Web API
- `discord.js` - Discord API (or raw HTTP)
- `googleapis` - Gmail API
- `@microsoft/microsoft-graph-client` - Outlook/Graph API
- `better-sqlite3` - Local storage
- `zod` - Schema validation

## Testing

- Colocate tests as `*.test.ts`
- Use vitest
- Mock external APIs in tests

## Commit Style

- Concise, action-oriented messages
- Format: `area: description` (e.g., `discord: add message handler`)
