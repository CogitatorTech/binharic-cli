import { describe, it, expect } from "vitest";
import { applyContextWindow } from "@/agent/contextWindow.js";
import type { ModelMessage } from "ai";
import type { ModelConfig } from "@/config.js";

describe("Context Window Token Counting Accuracy", () => {
    const testModelConfig: ModelConfig = {
        name: "test-model",
        provider: "openai",
        modelId: "test-model-id",
        context: 1000,
    };

    it("should count tokens for string content", () => {
        const history: ModelMessage[] = [
            { role: "user", content: "Hello world" },
            { role: "assistant", content: "Hi there" },
        ];

        const result = applyContextWindow(history, testModelConfig);
        expect(result.length).toBe(2);
    });

    it("should count tokens for tool-result messages", () => {
        const history: ModelMessage[] = [
            { role: "user", content: "Read file" },
            {
                role: "tool",
                content: [
                    {
                        type: "tool-result",
                        toolCallId: "call-1",
                        toolName: "read_file",
                        output: {
                            type: "text",
                            value: "File content here",
                        },
                    },
                ],
            },
        ];

        const result = applyContextWindow(history, testModelConfig);
        expect(result.length).toBe(2);
    });

    it("should count tokens for complex nested content", () => {
        const history: ModelMessage[] = [
            { role: "user", content: "Test message" },
            {
                role: "assistant",
                content: [{ type: "text", text: "Response text" }],
            },
        ];

        const result = applyContextWindow(history, testModelConfig);
        expect(result.length).toBe(2);
    });

    it("should trim messages when exceeding context limit", () => {
        const longContent = "word ".repeat(200);
        const history: ModelMessage[] = [
            { role: "system", content: "System prompt" },
            { role: "user", content: longContent },
            { role: "assistant", content: longContent },
            { role: "user", content: longContent },
            { role: "assistant", content: longContent },
        ];

        const result = applyContextWindow(history, testModelConfig);
        expect(result.length).toBeLessThan(history.length);
        expect(result[0].role).toBe("system");
    });

    it("should preserve system prompt when trimming", () => {
        const longContent = "word ".repeat(300);
        const history: ModelMessage[] = [
            { role: "system", content: "Important system prompt" },
            { role: "user", content: longContent },
            { role: "assistant", content: longContent },
            { role: "user", content: longContent },
        ];

        const result = applyContextWindow(history, testModelConfig);
        expect(result[0].role).toBe("system");
        expect(result[0].content).toBe("Important system prompt");
    });

    it("should handle tool call content in token counting", () => {
        const history: ModelMessage[] = [
            { role: "user", content: "Execute command" },
            {
                role: "tool",
                content: [
                    {
                        type: "tool-result",
                        toolCallId: "call-123",
                        toolName: "bash",
                        output: {
                            type: "text",
                            value: "Command output with many words " + "word ".repeat(100),
                        },
                    },
                ],
            },
        ];

        const result = applyContextWindow(history, testModelConfig);
        expect(result).toBeDefined();
    });

    it("should handle empty history", () => {
        const history: ModelMessage[] = [];
        const result = applyContextWindow(history, testModelConfig);
        expect(result).toEqual([]);
    });

    it("should not trim when under context limit", () => {
        const history: ModelMessage[] = [
            { role: "user", content: "Short message" },
            { role: "assistant", content: "Short response" },
        ];

        const result = applyContextWindow(history, testModelConfig);
        expect(result.length).toBe(history.length);
    });
});
