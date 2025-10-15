import type { AssistantContent } from "ai";
import type { ToolCall } from "../core/types.js";

export type UserMessageItem = {
    id: string;
    role: "user";
    content: string;
};

export type AssistantMessageItem = {
    id: string;
    role: "assistant";
    content: AssistantContent | string;
};

export type ToolRequestItem = {
    id: string;
    role: "tool-request";
    calls: ToolCall[];
};

export type ToolResultItem = {
    id: string;
    role: "tool-result";
    toolCallId: string;
    toolName: string;
    output: unknown;
};

export type ToolFailureItem = {
    id: string;
    role: "tool-failure";
    toolCallId: string;
    toolName: string;
    error: string;
};

export type HistoryItem =
    | UserMessageItem
    | AssistantMessageItem
    | ToolRequestItem
    | ToolResultItem
    | ToolFailureItem;
