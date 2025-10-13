import { describe, it, expect, beforeEach } from "vitest";
import { applyContextWindow } from "../../src/agent/contextWindow.js";
import type { ModelConfig } from "../../src/config.js";
import type { ModelMessage } from "ai";

describe("contextWindow", () => {
    let mockModelConfig: ModelConfig;

    beforeEach(() => {
        mockModelConfig = {
            name: "test-model",
            provider: "openai",
            modelId: "gpt-4",
            context: 1000,
        };
    });

    it("should not trim history when within context limit", () => {
        const history: ModelMessage[] = [
            { role: "user", content: "Hello" },
            { role: "assistant", content: "Hi there!" },
        ];

        const result = applyContextWindow(history, mockModelConfig);
        expect(result).toHaveLength(2);
        expect(result).toEqual(history);
    });

    it("should handle tool results with output field correctly", () => {
        const history: ModelMessage[] = [
            { role: "user", content: "List files" },
            {
                role: "tool",
                content: [
                    {
                        type: "tool-result",
                        toolCallId: "call_123",
                        toolName: "list",
                        output: {
                            type: "text",
                            value: "file1.txt\nfile2.txt\nfile3.txt",
                        },
                    },
                ],
            },
        ];

        const result = applyContextWindow(history, mockModelConfig);
        expect(result).toHaveLength(2);
    });

    it("should handle complex nested output structures", () => {
        const history: ModelMessage[] = [
            {
                role: "tool",
                content: [
                    {
                        type: "tool-result",
                        toolCallId: "call_456",
                        toolName: "read_file",
                        output: {
                            type: "text",
                            value: "const x = 1;\nconst y = 2;",
                        },
                    },
                ],
            },
        ];

        const result = applyContextWindow(history, mockModelConfig);
        expect(result).toHaveLength(1);
    });

    it("should trim oldest messages when exceeding context limit", () => {
        const longContent = "x".repeat(1500);
        const history: ModelMessage[] = [
            { role: "user", content: longContent },
            { role: "assistant", content: longContent },
            { role: "user", content: longContent },
            { role: "assistant", content: longContent },
            { role: "user", content: longContent },
        ];

        const result = applyContextWindow(history, mockModelConfig);
        expect(result.length).toBeLessThan(history.length);
    });

    it("should handle empty history", () => {
        const history: ModelMessage[] = [];
        const result = applyContextWindow(history, mockModelConfig);
        expect(result).toEqual([]);
    });

    it("should handle string content correctly", () => {
        const history: ModelMessage[] = [
            { role: "user", content: "Test message" },
            { role: "assistant", content: "Test response" },
        ];

        const result = applyContextWindow(history, mockModelConfig);
        expect(result).toEqual(history);
    });

    it("should handle array content with text parts", () => {
        const history: ModelMessage[] = [
            {
                role: "user",
                content: [{ type: "text", text: "Hello world" }],
            },
        ];

        const result = applyContextWindow(history, mockModelConfig);
        expect(result).toHaveLength(1);
    });
});
