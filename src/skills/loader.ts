/**
 * Skills loader - loads pre-defined and learned skills
 */

import type { Tool } from "../tools/types.js";

export interface Skill {
  name: string;
  description: string;
  tools: Tool[];
  enabled: boolean;
}

export interface SkillsConfig {
  builtinPath: string;
  userPath: string;
}

/**
 * Load all available skills
 */
export async function loadSkills(config: SkillsConfig): Promise<Skill[]> {
  const skills: Skill[] = [];

  // Load built-in skills
  const builtinSkills = await loadBuiltinSkills();
  skills.push(...builtinSkills);

  // Load user-defined skills from config.userPath
  // TODO: Scan directory for skill definitions
  // TODO: Support .ts, .js, and .json skill files

  return skills;
}

async function loadBuiltinSkills(): Promise<Skill[]> {
  return [
    {
      name: "email",
      description: "Handle emails - triage, draft replies, summarize",
      tools: [], // TODO: Add email-specific tools
      enabled: true,
    },
    {
      name: "calendar",
      description: "Manage calendar - schedule, check availability, reminders",
      tools: [], // TODO: Add calendar tools
      enabled: true,
    },
    {
      name: "contacts",
      description: "Manage contacts - lookup, add, update",
      tools: [], // TODO: Add contacts tools
      enabled: true,
    },
  ];
}

/**
 * Save a learned skill to disk
 */
export async function saveSkill(skill: Skill, path: string): Promise<void> {
  // TODO: Serialize skill to JSON and write to path
  console.log(`Saving skill ${skill.name} to ${path}`);
}
