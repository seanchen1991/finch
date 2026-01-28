/**
 * Convert Zod schema to JSON Schema for LLM tool definitions
 */

import type { z } from "zod";

interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  description?: string;
  items?: JsonSchema;
}

// Zod internal types (not exported, so we define them here)
interface ZodDef {
  typeName?: string;
  description?: string;
  shape?: () => Record<string, z.ZodType>;
  type?: z.ZodType;
  innerType?: z.ZodType;
}

/**
 * Convert a Zod schema to JSON Schema
 * Handles common types: object, string, number, boolean, array
 */
export function zodToJsonSchema(schema: z.ZodType): JsonSchema {
  const def = schema._def as ZodDef;
  const typeName = def.typeName;

  // Handle ZodObject
  if (typeName === "ZodObject" && def.shape) {
    const shape = def.shape();
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const fieldSchema = value as z.ZodType;
      const fieldDef = fieldSchema._def as ZodDef;
      properties[key] = zodToJsonSchema(fieldSchema);

      // Check if field is optional
      if (fieldDef.typeName !== "ZodOptional") {
        required.push(key);
      }
    }

    return {
      type: "object",
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
  }

  // Handle ZodString
  if (typeName === "ZodString") {
    return {
      type: "string",
      ...(def.description ? { description: def.description } : {}),
    };
  }

  // Handle ZodNumber
  if (typeName === "ZodNumber") {
    return {
      type: "number",
      ...(def.description ? { description: def.description } : {}),
    };
  }

  // Handle ZodBoolean
  if (typeName === "ZodBoolean") {
    return {
      type: "boolean",
      ...(def.description ? { description: def.description } : {}),
    };
  }

  // Handle ZodArray
  if (typeName === "ZodArray" && def.type) {
    return {
      type: "array",
      items: zodToJsonSchema(def.type),
      ...(def.description ? { description: def.description } : {}),
    };
  }

  // Handle ZodOptional - unwrap and recurse
  if (typeName === "ZodOptional" && def.innerType) {
    return zodToJsonSchema(def.innerType);
  }

  // Handle ZodDefault - unwrap and recurse
  if (typeName === "ZodDefault" && def.innerType) {
    return zodToJsonSchema(def.innerType);
  }

  // Fallback
  return { type: "string" };
}
