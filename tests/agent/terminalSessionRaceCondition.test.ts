import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
    cleanupAllSessions,
    getTerminalOutputTool,
    runInTerminalTool,
} from "@/agent/tools/definitions/terminalSession.js";

describe("Terminal Session - Race Conditions and Memory Leaks", () => {
    beforeEach(() => {
        cleanupAllSessions();
    });

    afterEach(() => {
        cleanupAllSessions();
    });

    it("should handle rapid consecutive command executions", async () => {
        const commands = [
            { command: "echo test1", explanation: "Test 1" },
            { command: "echo test2", explanation: "Test 2" },
            { command: "echo test3", explanation: "Test 3" },
        ];

        const results = await Promise.all(
            commands.map((cmd) => runInTerminalTool.execute(cmd, {} as any)),
        );

        expect(results).toHaveLength(3);
        results.forEach((result, i) => {
            expect(result).toContain(`test${i + 1}`);
        });
    });

    it("should prevent duplicate background sessions from same command", async () => {
        const result1 = await runInTerminalTool.execute(
            {
                command: "sleep 0.1",
                explanation: "Sleep test",
                isBackground: true,
            },
            {} as any,
        );

        const result2 = await runInTerminalTool.execute(
            {
                command: "sleep 0.1",
                explanation: "Sleep test 2",
                isBackground: true,
            },
            {} as any,
        );

        expect(result1).toContain("terminal-");
        expect(result2).toContain("terminal-");
        expect(result1).not.toBe(result2);

        const id1 = result1.match(/terminal-\d+/)?.[0];
        const id2 = result2.match(/terminal-\d+/)?.[0];

        expect(id1).toBeDefined();
        expect(id2).toBeDefined();
        expect(id1).not.toBe(id2);
    });

    it("should cleanup sessions properly", async () => {
        const result = await runInTerminalTool.execute(
            {
                command: "echo test",
                explanation: "Test",
                isBackground: true,
            },
            {} as any,
        );

        const sessionId = result.match(/terminal-\d+/)?.[0];
        expect(sessionId).toBeDefined();

        await new Promise((resolve) => setTimeout(resolve, 100));

        const output = await getTerminalOutputTool.execute({ id: sessionId! }, {} as any);
        expect(output).toContain("test");
    });

    it("should handle output size limits", async () => {
        const largeCommand = `bash -c 'for i in {1..100000}; do echo "line $i"; done'`;

        await expect(
            runInTerminalTool.execute(
                {
                    command: largeCommand,
                    explanation: "Large output test",
                },
                {} as any,
            ),
        ).rejects.toThrow(/output exceeded maximum size/i);
    }, 10000);

    it("should reject empty commands", async () => {
        await expect(
            runInTerminalTool.execute(
                {
                    command: "",
                    explanation: "Empty",
                },
                {} as any,
            ),
        ).rejects.toThrow(/Cannot execute empty command/);
    });

    it("should handle command timeout", async () => {
        await expect(
            runInTerminalTool.execute(
                {
                    command: "sleep 35",
                    explanation: "Long sleep",
                },
                {} as any,
            ),
        ).rejects.toThrow();
    }, 32000);

    it("should block dangerous commands", async () => {
        const dangerousCommands = ["rm -rf /", "chmod 777 /etc", "dd if=/dev/zero of=/dev/sda"];

        for (const cmd of dangerousCommands) {
            await expect(
                runInTerminalTool.execute(
                    {
                        command: cmd,
                        explanation: "Dangerous",
                    },
                    {} as any,
                ),
            ).rejects.toThrow(/Blocked potentially dangerous command/);
        }
    });
});
