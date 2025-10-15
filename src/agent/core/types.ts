import type { ToolCallPart } from "ai";

export type ToolCall = ToolCallPart & {
    args?: Record<string, unknown>;
};
