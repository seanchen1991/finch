/**
 * Shell tool - execute commands
 */

import { z } from "zod";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { defineTool, type Tool } from "./types.js";

const execAsync = promisify(exec);

export const shellTool: Tool = defineTool({
  name: "shell",
  description: "Execute a shell command and return the output",
  parameters: z.object({
    command: z.string().describe("The shell command to execute"),
    cwd: z.string().optional().describe("Working directory for the command"),
    timeout: z.number().default(30000).describe("Timeout in milliseconds"),
  }),
  async execute({ command, cwd, timeout }) {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout,
        maxBuffer: 1024 * 1024, // 1MB
      });
      const output = stdout + (stderr ? `\nstderr: ${stderr}` : "");
      return { success: true, output };
    } catch (err) {
      const error = err as Error & { stdout?: string; stderr?: string };
      return {
        success: false,
        output: error.stdout ?? "",
        error: error.stderr ?? error.message,
      };
    }
  },
});

export const shellTools: Tool[] = [shellTool];
