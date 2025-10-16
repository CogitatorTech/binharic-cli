import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileTracker } from "../../../src/agent/core/fileTracker.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

function getTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
}

function getMessageTokenCount(message: { role: string; content: unknown }): number {
    let tokens = 0;

    if (typeof message.content === "string") {
        tokens += getTokenCount(message.content);
    } else if (Array.isArray(message.content)) {
        for (const part of message.content) {
            if ("text" in part && typeof part.text === "string") {
                tokens += getTokenCount(part.text);
            } else if ("toolName" in part && typeof part.toolName === "string") {
                tokens += getTokenCount(part.toolName);
                tokens += 10;
                if ("args" in part && part.args) {
                    tokens += getTokenCount(JSON.stringify(part.args));
                }
            }
        }
    }

    tokens += 4;

    if (message.role === "tool") {
        tokens += 15;
    }

    return tokens;
}

describe("Context Window Token Overhead", () => {
    describe("Base Message Overhead", () => {
        it("should add base overhead to all messages", () => {
            const message = { role: "user", content: "" };
            const tokens = getMessageTokenCount(message);

            expect(tokens).toBeGreaterThanOrEqual(4);
        });

        it("should count string content correctly", () => {
            const message = { role: "user", content: "hello world" };
            const tokens = getMessageTokenCount(message);
            const baseOverhead = 4;

            expect(tokens).toBeGreaterThan(baseOverhead);
        });
    });

    describe("Tool Message Overhead", () => {
        it("should add extra overhead for tool messages", () => {
            const userMessage = { role: "user", content: "test" };
            const toolMessage = { role: "tool", content: "test" };

            const userTokens = getMessageTokenCount(userMessage);
            const toolTokens = getMessageTokenCount(toolMessage);

            expect(toolTokens).toBeGreaterThan(userTokens);
            expect(toolTokens - userTokens).toBe(15);
        });

        it("should account for tool call overhead", () => {
            const message = {
                role: "assistant",
                content: [
                    {
                        toolName: "read_file",
                        args: { path: "/test/file.txt" },
                    },
                ],
            };

            const tokens = getMessageTokenCount(message);
            const toolNameTokens = Math.ceil("read_file".length / 4);
            const argsTokens = Math.ceil(JSON.stringify({ path: "/test/file.txt" }).length / 4);
            const overhead = 10;

            expect(tokens).toBeGreaterThanOrEqual(toolNameTokens + argsTokens + overhead + 4);
        });
    });

    describe("Complex Message Structures", () => {
        it("should handle array content with tool calls", () => {
            const message = {
                role: "assistant",
                content: [
                    {
                        toolName: "create",
                        args: { path: "test.ts", content: "const x = 1;" },
                    },
                    {
                        toolName: "read_file",
                        args: { path: "test.ts" },
                    },
                ],
            };

            const tokens = getMessageTokenCount(message);
            expect(tokens).toBeGreaterThan(40);
        });

        it("should handle tool result messages", () => {
            const message = {
                role: "tool",
                content: [
                    {
                        output: { value: "File content here" },
                    },
                ],
            };

            const tokens = getMessageTokenCount(message);
            expect(tokens).toBeGreaterThan(15);
        });

        it("should handle mixed content arrays", () => {
            const message = {
                role: "assistant",
                content: [
                    { text: "I'll help with that" },
                    {
                        toolName: "edit",
                        args: { path: "file.ts", edit: { type: "replace" } },
                    },
                ],
            };

            const tokens = getMessageTokenCount(message);
            expect(tokens).toBeGreaterThan(30);
        });
    });

    describe("Overhead Accuracy", () => {
        it("should not undercount tool overhead", () => {
            const messageWithoutOverhead = {
                role: "assistant",
                content: "call read_file",
            };

            const messageWithOverhead = {
                role: "assistant",
                content: [
                    {
                        toolName: "read_file",
                        args: {},
                    },
                ],
            };

            const tokensWithout = getMessageTokenCount(messageWithoutOverhead);
            const tokensWith = getMessageTokenCount(messageWithOverhead);

            expect(tokensWith).toBeGreaterThan(tokensWithout);
        });

        it("should account for tool metadata properly", () => {
            const simpleMessage = { role: "user", content: "read file" };
            const toolMessage = { role: "tool", content: "read file" };

            const simpleTokens = getMessageTokenCount(simpleMessage);
            const toolTokens = getMessageTokenCount(toolMessage);

            const overhead = toolTokens - simpleTokens;
            expect(overhead).toBe(15);
        });
    });

    describe("Large Tool Arguments", () => {
        it("should properly count large tool arguments", () => {
            const largeContent = "x".repeat(1000);
            const message = {
                role: "assistant",
                content: [
                    {
                        toolName: "create",
                        args: { path: "file.ts", content: largeContent },
                    },
                ],
            };

            const tokens = getMessageTokenCount(message);
            expect(tokens).toBeGreaterThan(250);
        });

        it("should count JSON serialization overhead", () => {
            const complexArgs = {
                path: "test.ts",
                content: "code here",
                metadata: {
                    timestamp: Date.now(),
                    user: "test",
                },
            };

            const message = {
                role: "assistant",
                content: [
                    {
                        toolName: "create",
                        args: complexArgs,
                    },
                ],
            };

            const tokens = getMessageTokenCount(message);
            const serialized = JSON.stringify(complexArgs);

            expect(tokens).toBeGreaterThan(serialized.length / 4);
        });
    });

    describe("Empty and Edge Cases", () => {
        it("should handle empty content", () => {
            const message = { role: "user", content: "" };
            const tokens = getMessageTokenCount(message);

            expect(tokens).toBe(4);
        });

        it("should handle empty tool args", () => {
            const message = {
                role: "assistant",
                content: [
                    {
                        toolName: "list",
                        args: {},
                    },
                ],
            };

            const tokens = getMessageTokenCount(message);
            expect(tokens).toBeGreaterThan(10);
        });

        it("should handle undefined args gracefully", () => {
            const message = {
                role: "assistant",
                content: [
                    {
                        toolName: "validate",
                    },
                ],
            };

            const tokens = getMessageTokenCount(message);
            expect(tokens).toBeGreaterThan(10);
        });
    });
});

describe("FileTracker Observability", () => {
    let tracker: FileTracker;
    let testDir: string;
    let originalCwd: string;

    beforeEach(async () => {
        tracker = new FileTracker();
        originalCwd = process.cwd();
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), "filetracker-test-"));
    });

    afterEach(async () => {
        tracker.clearTracking();

        if (process.cwd() !== originalCwd) {
            process.chdir(originalCwd);
        }

        try {
            await fs.rm(testDir, { recursive: true, force: true, maxRetries: 3 });
        } catch (error) {}
    });

    it("should track files after reading", async () => {
        const filePath = path.join(testDir, "test.txt");
        await fs.writeFile(filePath, "content");

        expect(tracker.getTrackedFileCount()).toBe(0);
        expect(tracker.isTracked(filePath)).toBe(false);

        await tracker.read(filePath);

        expect(tracker.getTrackedFileCount()).toBe(1);
        expect(tracker.isTracked(filePath)).toBe(true);
        expect(tracker.getTrackedFiles()).toContain(path.resolve(filePath));
    });

    it("should track files after writing", async () => {
        const filePath = path.join(testDir, "new.txt");

        expect(tracker.isTracked(filePath)).toBe(false);

        await tracker.write(filePath, "content");

        expect(tracker.isTracked(filePath)).toBe(true);
        expect(tracker.getTrackedFileCount()).toBe(1);
    });

    it("should return list of tracked files", async () => {
        const file1 = path.join(testDir, "file1.txt");
        const file2 = path.join(testDir, "file2.txt");

        await tracker.write(file1, "content1");
        await tracker.write(file2, "content2");

        const tracked = tracker.getTrackedFiles();
        expect(tracked).toHaveLength(2);
        expect(tracked).toContain(path.resolve(file1));
        expect(tracked).toContain(path.resolve(file2));
    });

    it("should clear all tracking", async () => {
        const file1 = path.join(testDir, "file1.txt");
        const file2 = path.join(testDir, "file2.txt");

        await tracker.write(file1, "content1");
        await tracker.write(file2, "content2");

        expect(tracker.getTrackedFileCount()).toBe(2);

        tracker.clearTracking();

        expect(tracker.getTrackedFileCount()).toBe(0);
        expect(tracker.getTrackedFiles()).toHaveLength(0);
        expect(tracker.isTracked(file1)).toBe(false);
    });

    it("should use absolute paths for tracking", async () => {
        const relativePath = "test.txt";
        const absolutePath = path.resolve(testDir, relativePath);
        await fs.writeFile(absolutePath, "content");

        process.chdir(testDir);
        await tracker.read(relativePath);

        expect(tracker.isTracked(absolutePath)).toBe(true);
        expect(tracker.getTrackedFiles()[0]).toBe(absolutePath);
    });

    it("should update tracked files on re-read", async () => {
        const filePath = path.join(testDir, "test.txt");
        await fs.writeFile(filePath, "content1");

        await tracker.read(filePath);
        const firstTracked = tracker.getTrackedFiles();

        await fs.writeFile(filePath, "content2");
        await new Promise((resolve) => setTimeout(resolve, 10));

        await tracker.read(filePath);
        const secondTracked = tracker.getTrackedFiles();

        expect(firstTracked).toHaveLength(1);
        expect(secondTracked).toHaveLength(1);
        expect(tracker.getTrackedFileCount()).toBe(1);
    });
});
