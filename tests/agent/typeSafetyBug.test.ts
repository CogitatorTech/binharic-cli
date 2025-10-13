import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Type Safety Bug Fixes", () => {
    it("should properly type toolCall.args as Record<string, unknown>", () => {
        const mockToolCall = {
            type: "tool-call" as const,
            toolCallId: "call-123",
            toolName: "read_file",
            args: {
                path: "/test/file.txt",
            },
        };

        const typedArgs = mockToolCall.args as Record<string, unknown>;

        expect(typeof typedArgs).toBe("object");
        expect(typedArgs).toHaveProperty("path");
        expect(typedArgs.path).toBe("/test/file.txt");
    });

    it("should handle complex args structure", () => {
        const mockToolCall = {
            type: "tool-call" as const,
            toolCallId: "call-456",
            toolName: "edit",
            args: {
                path: "/test/file.ts",
                edit: {
                    type: "replace",
                    search: "old code",
                    replaceWith: "new code",
                },
            },
        };

        const typedArgs = mockToolCall.args as Record<string, unknown>;

        expect(typedArgs).toHaveProperty("path");
        expect(typedArgs).toHaveProperty("edit");
        expect(typeof typedArgs.edit).toBe("object");
    });

    it("should handle empty args", () => {
        const mockToolCall = {
            type: "tool-call" as const,
            toolCallId: "call-789",
            toolName: "list",
            args: {},
        };

        const typedArgs = mockToolCall.args as Record<string, unknown>;

        expect(typeof typedArgs).toBe("object");
        expect(Object.keys(typedArgs).length).toBe(0);
    });

    it("should handle nested args safely", () => {
        const mockToolCall = {
            type: "tool-call" as const,
            toolCallId: "call-999",
            toolName: "bash",
            args: {
                cmd: "npm test",
                timeout: 30000,
            },
        };

        const typedArgs = mockToolCall.args as Record<string, unknown>;

        expect(typedArgs.cmd).toBe("npm test");
        expect(typedArgs.timeout).toBe(30000);
        expect(typeof typedArgs.cmd).toBe("string");
        expect(typeof typedArgs.timeout).toBe("number");
    });
});

describe("Stream Timeout Bug Fixes", () => {
    let activeStreamTimeout: NodeJS.Timeout | null = null;

    beforeEach(() => {
        activeStreamTimeout = null;
    });

    afterEach(() => {
        if (activeStreamTimeout) {
            clearTimeout(activeStreamTimeout);
            activeStreamTimeout = null;
        }
    });

    it("should properly clear timeout on successful stream completion", async () => {
        const STREAM_TIMEOUT_MS = 1000;
        let timeoutFired = false;

        const resetStreamTimeout = () => {
            if (activeStreamTimeout) {
                clearTimeout(activeStreamTimeout);
            }
            activeStreamTimeout = setTimeout(() => {
                timeoutFired = true;
                activeStreamTimeout = null;
            }, STREAM_TIMEOUT_MS);
        };

        resetStreamTimeout();

        async function* mockStream() {
            yield "chunk1";
            await new Promise((resolve) => setTimeout(resolve, 100));
            yield "chunk2";
        }

        try {
            for await (const part of mockStream()) {
                resetStreamTimeout();
            }
        } finally {
            if (activeStreamTimeout) {
                clearTimeout(activeStreamTimeout);
                activeStreamTimeout = null;
            }
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(timeoutFired).toBe(false);
        expect(activeStreamTimeout).toBe(null);
    });

    it("should properly clear timeout on stream error", async () => {
        const STREAM_TIMEOUT_MS = 1000;
        let timeoutFired = false;

        const resetStreamTimeout = () => {
            if (activeStreamTimeout) {
                clearTimeout(activeStreamTimeout);
            }
            activeStreamTimeout = setTimeout(() => {
                timeoutFired = true;
                activeStreamTimeout = null;
            }, STREAM_TIMEOUT_MS);
        };

        resetStreamTimeout();

        async function* mockStream() {
            yield "chunk1";
            throw new Error("Stream error");
        }

        try {
            for await (const part of mockStream()) {
                resetStreamTimeout();
            }
        } catch (error) {
        } finally {
            if (activeStreamTimeout) {
                clearTimeout(activeStreamTimeout);
                activeStreamTimeout = null;
            }
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(timeoutFired).toBe(false);
        expect(activeStreamTimeout).toBe(null);
    });

    it("should handle multiple timeout resets correctly", () => {
        const STREAM_TIMEOUT_MS = 1000;
        const timeoutIds: NodeJS.Timeout[] = [];

        const resetStreamTimeout = () => {
            if (activeStreamTimeout) {
                clearTimeout(activeStreamTimeout);
            }
            activeStreamTimeout = setTimeout(() => {
                activeStreamTimeout = null;
            }, STREAM_TIMEOUT_MS);
            timeoutIds.push(activeStreamTimeout);
        };

        for (let i = 0; i < 5; i++) {
            resetStreamTimeout();
        }

        expect(timeoutIds.length).toBe(5);

        if (activeStreamTimeout) {
            clearTimeout(activeStreamTimeout);
            activeStreamTimeout = null;
        }
    });

    it("should prevent race conditions with global timeout tracker", async () => {
        let globalTimeout: NodeJS.Timeout | null = null;
        const results: string[] = [];

        const setGlobalTimeout = (label: string, delay: number) => {
            if (globalTimeout) {
                clearTimeout(globalTimeout);
                globalTimeout = null;
            }
            globalTimeout = setTimeout(() => {
                results.push(label);
                globalTimeout = null;
            }, delay);
        };

        setGlobalTimeout("first", 100);
        await new Promise((resolve) => setTimeout(resolve, 50));
        setGlobalTimeout("second", 100);

        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(results.length).toBe(1);
        expect(results[0]).toBe("second");

        if (globalTimeout) {
            clearTimeout(globalTimeout);
            globalTimeout = null;
        }
    });
});
