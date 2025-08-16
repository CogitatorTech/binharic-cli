// src/agent/types.ts
// REFACTORED: Simplified to only contain shared tool-related types.

import { z } from "zod";
import { toolSchemas } from "./tools/definitions/index.js";
import type { ToolCallPart } from "ai";

export const toolCallSchema = z.discriminatedUnion("name", toolSchemas);
export type ToolCall = ToolCallPart;
