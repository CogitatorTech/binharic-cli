import { describe, it, expect, beforeEach } from "vitest";
import { runTool } from "../../src/agent/tools/index.js";
import type { Config } from "../../src/config.js";

describe("Tool Argument Handling", () => {
    let mockConfig: Config;

    beforeEach(() => {
        mockConfig = {
            userName: "testuser",
            systemPrompt: "test",
            defaultModel: "test-model",
            models: [],
            history: { maxItems: null },
        };
    });

    it("should handle tool arguments correctly", async () => {
        const result = await runTool(
            {
                toolName: "list",
                args: { path: "." },
            },
            mockConfig,
        );

        expect(result).toBeDefined();
        expect(typeof result).toBe("string");
    });

    it("should throw error for missing arguments", async () => {
        await expect(
            runTool(
                {
                    toolName: "read_file",
                    args: {},
                },
                mockConfig,
            ),
        ).rejects.toThrow();
    });

    it("should throw error for invalid tool name", async () => {
        await expect(
            runTool(
                {
                    toolName: "nonexistent_tool",
                    args: {},
                },
                mockConfig,
            ),
        ).rejects.toThrow(/not found/);
    });

    it("should validate argument types", async () => {
        await expect(
            runTool(
                {
                    toolName: "bash",
                    args: { cmd: 123 as any },
                },
                mockConfig,
            ),
        ).rejects.toThrow();
    });

    it("should handle optional arguments", async () => {
        const result = await runTool(
            {
                toolName: "bash",
                args: { cmd: "echo test" },
            },
            mockConfig,
        );

        expect(result).toBeDefined();
    });
});
