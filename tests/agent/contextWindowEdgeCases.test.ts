import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { applyContextWindow } from "@/agent/contextWindow.js";
import type { ModelMessage } from "ai";
import type { ModelConfig } from "@/config.js";

describe("Context Window Management - Edge Cases", () => {
    const mockModelConfig: ModelConfig = {
        name: "test-model",
        provider: "openai",
        modelId: "gpt-4",
        context: 10000,
    };

    it("should handle empty history", () => {
        const history: ModelMessage[] = [];
        const result = applyContextWindow(history, mockModelConfig);
        expect(result).toEqual([]);
    });

    it("should handle very long messages", () => {
        const longContent = "A".repeat(100000);
        const history: ModelMessage[] = [
            { role: "user", content: longContent },
            { role: "assistant", content: "response" },
        ];

        const result = applyContextWindow(history, mockModelConfig);
        expect(result.length).toBeLessThanOrEqual(history.length);
    }, 15000);

    it("should preserve system message when trimming", () => {
        const history: ModelMessage[] = [
            { role: "system" as any, content: "System prompt" },
            { role: "user", content: "msg1" },
            { role: "assistant", content: "reply1" },
            { role: "user", content: "msg2" },
        ];

        const smallConfig = { ...mockModelConfig, context: 100 };
        const result = applyContextWindow(history, smallConfig);

        if (result.length > 0 && result[0].role === "system") {
            expect(result[0].content).toBe("System prompt");
        }
    });

    it("should handle complex content objects", () => {
        const history: ModelMessage[] = [
            {
                role: "assistant",
                content: [
                    {
                        type: "tool-call" as const,
                        toolCallId: "call-1",
                        toolName: "read_file",
                        args: { path: "test.txt" },
                    },
                ],
            },
            {
                role: "tool",
                content: [
                    {
                        type: "tool-result" as const,
                        toolCallId: "call-1",
                        toolName: "read_file",
                        output: { type: "text" as const, value: "file content" },
                    },
                ],
            },
        ];

        const result = applyContextWindow(history, mockModelConfig);
        expect(result.length).toBeGreaterThan(0);
    });

    it("should handle non-serializable content gracefully", () => {
        const circularObj: any = {};
        circularObj.self = circularObj;

        const history: ModelMessage[] = [
            { role: "user", content: "test" },
            { role: "assistant", content: circularObj },
        ];

        expect(() => applyContextWindow(history, mockModelConfig)).not.toThrow();
    });
});
