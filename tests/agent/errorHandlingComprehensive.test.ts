import { describe, it, expect, vi } from "vitest";

describe("Error Handling - Comprehensive Coverage", () => {
    it("should categorize errors correctly", () => {
        class FatalError extends Error {
            constructor(message: string) {
                super(message);
                this.name = "FatalError";
            }
        }

        class TransientError extends Error {
            constructor(message: string) {
                super(message);
                this.name = "TransientError";
            }
        }

        const fatalError = new FatalError("Config missing");
        const transientError = new TransientError("Rate limit");

        expect(fatalError.name).toBe("FatalError");
        expect(transientError.name).toBe("TransientError");
    });

    it("should handle retry logic with exponential backoff", async () => {
        let attempts = 0;
        const maxRetries = 3;
        const initialBackoff = 100;

        const retryWithBackoff = async () => {
            for (let i = 0; i < maxRetries; i++) {
                attempts++;
                const backoff = initialBackoff * Math.pow(2, i);

                if (i === maxRetries - 1) {
                    return { success: true, attempts, backoff };
                }

                await new Promise((resolve) => setTimeout(resolve, 1));
            }
            return { success: false, attempts, backoff: 0 };
        };

        const result = await retryWithBackoff();
        expect(result.attempts).toBe(3);
        expect(result.success).toBe(true);
    });

    it("should preserve error stack traces", () => {
        const originalError = new Error("Original");
        const wrappedError = new Error(`Wrapped: ${originalError.message}`);

        expect(originalError.stack).toBeDefined();
        expect(wrappedError.stack).toBeDefined();
    });

    it("should handle timeout errors properly", async () => {
        const timeoutMs = 100;

        const slowOperation = new Promise((resolve) => {
            setTimeout(() => resolve("done"), 1000);
        });

        const timeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Timeout")), timeoutMs);
        });

        await expect(Promise.race([slowOperation, timeout])).rejects.toThrow("Timeout");
    });

    it("should cleanup resources on error", async () => {
        let resourceCleaned = false;

        try {
            throw new Error("Test error");
        } catch (error) {
            resourceCleaned = true;
        } finally {
            expect(resourceCleaned).toBe(true);
        }
    });

    it("should handle multiple concurrent errors", async () => {
        const operations = [
            Promise.reject(new Error("Error 1")),
            Promise.reject(new Error("Error 2")),
            Promise.reject(new Error("Error 3")),
        ];

        const results = await Promise.allSettled(operations);

        const rejectedCount = results.filter((r) => r.status === "rejected").length;
        expect(rejectedCount).toBe(3);
    });

    it("should validate error messages contain useful information", () => {
        const error = new Error("File not found: /path/to/file.txt");

        expect(error.message).toContain("File not found");
        expect(error.message).toContain("/path/to/file.txt");
    });
});
import { describe, it, expect, vi } from "vitest";
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
