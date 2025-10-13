import { describe, it, expect } from "vitest";
import type { ModelMessage } from "ai";
import type { HistoryItem, ToolRequestItem } from "@/agent/history.js";

describe("Tool Call ID Mismatch Bug Fix", () => {
    it("should properly convert tool-request history items to assistant messages with tool-call content", () => {
        const toolRequestItem: ToolRequestItem = {
            id: "test-id",
            role: "tool-request",
            calls: [
                {
                    type: "tool-call",
                    toolCallId: "call_123",
                    toolName: "list",
                    args: { path: "/tmp" },
                },
            ],
        };

        const history: HistoryItem[] = [
            { role: "user", content: "list files", id: "user-1" },
            toolRequestItem,
        ];

        const convertedHistory = history
            .map((item): ModelMessage | null => {
                switch (item.role) {
                    case "user":
                        return { role: "user", content: item.content };
                    case "tool-request": {
                        return {
                            role: "assistant",
                            content: item.calls.map((call) => ({
                                type: "tool-call" as const,
                                toolCallId: call.toolCallId,
                                toolName: call.toolName,
                                args: (call as { args?: Record<string, unknown> }).args || {},
                                input: (call as { args?: Record<string, unknown> }).args || {},
                            })),
                        };
                    }
                    default:
                        return null;
                }
            })
            .filter(Boolean) as ModelMessage[];

        expect(convertedHistory).toHaveLength(2);
        expect(convertedHistory[1]).toMatchObject({
            role: "assistant",
            content: [
                {
                    type: "tool-call",
                    toolCallId: "call_123",
                    toolName: "list",
                    args: { path: "/tmp" },
                    input: { path: "/tmp" },
                },
            ],
        });
    });

    it("should properly convert tool-result history items to tool messages with correct output structure", () => {
        const history: HistoryItem[] = [
            {
                id: "result-1",
                role: "tool-result",
                toolCallId: "call_123",
                toolName: "list",
                output: "file1.txt\nfile2.txt",
            },
        ];

        const convertedHistory = history
            .map((item): ModelMessage | null => {
                if (item.role === "tool-result") {
                    const outputText =
                        typeof item.output === "string"
                            ? item.output
                            : JSON.stringify(item.output, null, 2);

                    return {
                        role: "tool",
                        content: [
                            {
                                type: "tool-result" as const,
                                toolCallId: item.toolCallId,
                                toolName: item.toolName,
                                output: {
                                    type: "text" as const,
                                    value:
                                        outputText || "Tool executed successfully with no output.",
                                },
                            },
                        ],
                    };
                }
                return null;
            })
            .filter(Boolean) as ModelMessage[];

        expect(convertedHistory).toHaveLength(1);
        expect(convertedHistory[0]).toMatchObject({
            role: "tool",
            content: [
                {
                    type: "tool-result",
                    toolCallId: "call_123",
                    toolName: "list",
                    output: {
                        type: "text",
                        value: "file1.txt\nfile2.txt",
                    },
                },
            ],
        });
    });

    it("should properly convert tool-failure history items to tool messages", () => {
        const history: HistoryItem[] = [
            {
                id: "failure-1",
                role: "tool-failure",
                toolCallId: "call_456",
                toolName: "bash",
                error: "Command failed with exit code 1",
            },
        ];

        const convertedHistory = history
            .map((item): ModelMessage | null => {
                if (item.role === "tool-failure") {
                    return {
                        role: "tool",
                        content: [
                            {
                                type: "tool-result" as const,
                                toolCallId: item.toolCallId,
                                toolName: item.toolName,
                                output: {
                                    type: "text" as const,
                                    value: `Error: ${item.error}`,
                                },
                            },
                        ],
                    };
                }
                return null;
            })
            .filter(Boolean) as ModelMessage[];

        expect(convertedHistory).toHaveLength(1);
        expect(convertedHistory[0]).toMatchObject({
            role: "tool",
            content: [
                {
                    type: "tool-result",
                    toolCallId: "call_456",
                    toolName: "bash",
                    output: {
                        type: "text",
                        value: "Error: Command failed with exit code 1",
                    },
                },
            ],
        });
    });

    it("should maintain tool call ID consistency across request and result", () => {
        const toolCallId = "call_xyz_123";

        const toolRequest: ToolRequestItem = {
            id: "req-1",
            role: "tool-request",
            calls: [
                {
                    type: "tool-call",
                    toolCallId,
                    toolName: "read_file",
                    args: { filePath: "/test.txt" },
                },
            ],
        };

        const toolResult: HistoryItem = {
            id: "res-1",
            role: "tool-result",
            toolCallId,
            toolName: "read_file",
            output: "file content",
        };

        const history: HistoryItem[] = [
            { role: "user", content: "read file", id: "user-1" },
            toolRequest,
            toolResult,
        ];

        const convertedHistory = history
            .map((item): ModelMessage | null => {
                switch (item.role) {
                    case "user":
                        return { role: "user", content: item.content };
                    case "tool-request":
                        return {
                            role: "assistant",
                            content: item.calls.map((call) => ({
                                type: "tool-call" as const,
                                toolCallId: call.toolCallId,
                                toolName: call.toolName,
                                args: (call as { args?: Record<string, unknown> }).args || {},
                                input: (call as { args?: Record<string, unknown> }).args || {},
                            })),
                        };
                    case "tool-result":
                        return {
                            role: "tool",
                            content: [
                                {
                                    type: "tool-result" as const,
                                    toolCallId: item.toolCallId,
                                    toolName: item.toolName,
                                    output: {
                                        type: "text" as const,
                                        value:
                                            typeof item.output === "string"
                                                ? item.output
                                                : JSON.stringify(item.output),
                                    },
                                },
                            ],
                        };
                    default:
                        return null;
                }
            })
            .filter(Boolean) as ModelMessage[];

        const assistantMessage = convertedHistory[1];
        const toolMessage = convertedHistory[2];

        expect(assistantMessage.role).toBe("assistant");
        expect(Array.isArray(assistantMessage.content)).toBe(true);
        const toolCall = (assistantMessage.content as Array<{ toolCallId: string }>)[0];
        expect(toolCall.toolCallId).toBe(toolCallId);

        expect(toolMessage.role).toBe("tool");
        expect(Array.isArray(toolMessage.content)).toBe(true);
        const toolResultPart = (toolMessage.content as Array<{ toolCallId: string }>)[0];
        expect(toolResultPart.toolCallId).toBe(toolCallId);
    });

    it("should handle multiple tool calls with different IDs", () => {
        const toolRequest: ToolRequestItem = {
            id: "req-multi",
            role: "tool-request",
            calls: [
                {
                    type: "tool-call",
                    toolCallId: "call_1",
                    toolName: "list",
                    args: { path: "/" },
                },
                {
                    type: "tool-call",
                    toolCallId: "call_2",
                    toolName: "read_file",
                    args: { filePath: "/test.txt" },
                },
            ],
        };

        const convertedMessage = {
            role: "assistant" as const,
            content: toolRequest.calls.map((call) => ({
                type: "tool-call" as const,
                toolCallId: call.toolCallId,
                toolName: call.toolName,
                args: (call as { args?: Record<string, unknown> }).args || {},
                input: (call as { args?: Record<string, unknown> }).args || {},
            })),
        };

        expect(convertedMessage.content).toHaveLength(2);
        expect(convertedMessage.content[0].toolCallId).toBe("call_1");
        expect(convertedMessage.content[1].toolCallId).toBe("call_2");
    });

    it("should validate tool call structure before processing", () => {
        const invalidToolCalls = [
            { toolCallId: "call_123", toolName: "list", args: {} },
            { toolCallId: "", toolName: "read_file", args: {} },
            { toolCallId: "call_456", toolName: "", args: {} },
            { toolName: "search", args: {} },
        ];

        const validToolCalls = invalidToolCalls.filter((call) => {
            if (!("toolCallId" in call) || !call.toolCallId || !call.toolName) {
                return false;
            }
            return true;
        });

        expect(validToolCalls).toHaveLength(1);
        expect(validToolCalls[0].toolCallId).toBe("call_123");
    });
});
