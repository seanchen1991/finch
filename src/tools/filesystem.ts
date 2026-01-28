/**
 * Filesystem tools - read, write, list files
 */

import { z } from "zod";
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { defineTool, type Tool } from "./types.js";

export const readFileTool: Tool = defineTool({
  name: "read_file",
  description: "Read the contents of a file",
  parameters: z.object({
    path: z.string().describe("Absolute path to the file"),
  }),
  async execute({ path }) {
    try {
      const content = await readFile(path, "utf-8");
      return { success: true, output: content };
    } catch (err) {
      return { success: false, output: "", error: String(err) };
    }
  },
});

export const writeFileTool: Tool = defineTool({
  name: "write_file",
  description: "Write content to a file",
  parameters: z.object({
    path: z.string().describe("Absolute path to the file"),
    content: z.string().describe("Content to write"),
  }),
  async execute({ path, content }) {
    try {
      await writeFile(path, content, "utf-8");
      return { success: true, output: `Wrote ${content.length} bytes to ${path}` };
    } catch (err) {
      return { success: false, output: "", error: String(err) };
    }
  },
});

export const listDirectoryTool: Tool = defineTool({
  name: "list_directory",
  description: "List files and directories in a path",
  parameters: z.object({
    path: z.string().describe("Absolute path to the directory"),
  }),
  async execute({ path }) {
    try {
      const entries = await readdir(path, { withFileTypes: true });
      const output = entries
        .map((e) => `${e.isDirectory() ? "d" : "f"} ${e.name}`)
        .join("\n");
      return { success: true, output };
    } catch (err) {
      return { success: false, output: "", error: String(err) };
    }
  },
});

export const filesystemTools: Tool[] = [
  readFileTool,
  writeFileTool,
  listDirectoryTool,
];
