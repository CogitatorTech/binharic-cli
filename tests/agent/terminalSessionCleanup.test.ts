import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runTool } from "@/agent/tools/index.js";
import type { Config } from "@/config.js";
import { loadConfig } from "@/config.js";

describe("Terminal Session Cleanup", () => {
    let config: Config;

    beforeEach(async () => {
        config = await loadConfig();
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    it("should validate empty commands", async () => {
        await expect(
            runTool(
                {
                    toolName: "run_in_terminal",
                    args: { command: "", explanation: "test" },
                },
                config,
            ),
        ).rejects.toThrow("Cannot execute empty command");
    });

    it("should validate command length", async () => {
        const longCommand = "echo " + "a".repeat(10001);
        await expect(
            runTool(
                {
                    toolName: "run_in_terminal",
                    args: { command: longCommand, explanation: "test" },
                },
                config,
            ),
        ).rejects.toThrow("exceeds maximum length");
    });

    it("should reject interactive commands", async () => {
        await expect(
            runTool(
                {
                    toolName: "run_in_terminal",
                    args: { command: "vim test.txt", explanation: "test" },
                },
                config,
            ),
        ).rejects.toThrow("Cannot run interactive command");
    });

    it("should detect dangerous patterns", async () => {
        await expect(
            runTool(
                {
                    toolName: "run_in_terminal",
                    args: { command: "rm -rf /", explanation: "test" },
                },
                config,
            ),
        ).rejects.toThrow("Dangerous rm command detected");
    });

    it("should execute safe commands", async () => {
        const result = await runTool(
            {
                toolName: "run_in_terminal",
                args: { command: "echo 'test'", explanation: "test echo", isBackground: false },
            },
            config,
        );

        expect(result).toContain("test");
    });

    it("should start background processes", async () => {
        const result = await runTool(
            {
                toolName: "run_in_terminal",
                args: { command: "sleep 1", explanation: "background sleep", isBackground: true },
            },
            config,
        );

        expect(result).toContain("Background process started");
        expect(result).toContain("session ID");
    });

    it("should handle session limit", async () => {
        const promises = [];
        for (let i = 0; i < 11; i++) {
            promises.push(
                runTool(
                    {
                        toolName: "run_in_terminal",
                        args: { command: "sleep 10", explanation: `test ${i}`, isBackground: true },
                    },
                    config,
                ),
            );
        }

        const results = await Promise.allSettled(promises);
        const rejected = results.filter((r) => r.status === "rejected");
        expect(rejected.length).toBeGreaterThan(0);
    });

    it("should validate session ID for get_terminal_output", async () => {
        await expect(
            runTool(
                {
                    toolName: "get_terminal_output",
                    args: { id: "" },
                },
                config,
            ),
        ).rejects.toThrow("Invalid session ID");
    });

    it("should handle non-existent session", async () => {
        await expect(
            runTool(
                {
                    toolName: "get_terminal_output",
                    args: { id: "nonexistent-session-id" },
                },
                config,
            ),
        ).rejects.toThrow("No terminal session found");
    });
});
