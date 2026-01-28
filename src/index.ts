#!/usr/bin/env node

/**
 * Finch - Lightweight local-first AI assistant
 */

import { loadConfig } from "./config/config.js";

async function main() {
  console.log("Finch v0.0.1");

  const config = await loadConfig();
  console.log("Config loaded:", config.model);

  // TODO: Initialize LLM
  // TODO: Initialize channels
  // TODO: Initialize memory
  // TODO: Load skills
  // TODO: Start agent loop
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
