# Finch 🐦

A lightweight local-first AI assistant that runs on Mac Mini with Qwen models via llama.cpp. Inspired by Molt Bot 🦞

## Features

- **Local LLM**: Runs Qwen models directly via llama.cpp (no cloud APIs required)
- **Channels**: Gmail, Outlook, Discord, WhatsApp
- **Coding Agent**: Filesystem and OS operations
- **Skills System**: Pre-defined and learnable skills
- **Memory**: Learns user preferences over time

## Quick Start

```bash
# Install dependencies
pnpm install

# Download a Qwen model (example)
mkdir -p ~/.finch/models
# Download qwen2.5-7b-instruct.gguf to ~/.finch/models/

# Run
pnpm dev
```

## Documentation

See [DESIGN.md](./DESIGN.md) for architecture and design decisions.

## Status

🚧 Early development - not yet functional.
