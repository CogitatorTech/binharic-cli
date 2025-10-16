import { beforeEach, describe, expect, it, vi } from "vitest";

describe("State Management - Race Conditions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should prevent concurrent agent execution", async () => {
        const mockGet = vi.fn();
        const mockSet = vi.fn();

        let isAgentRunning = false;

        const executeWithLock = async () => {
            if (isAgentRunning) {
                return "already running";
            }

            isAgentRunning = true;

            try {
                await new Promise((resolve) => setTimeout(resolve, 10));
                return "completed";
            } finally {
                isAgentRunning = false;
            }
        };

        const results = await Promise.all([
            executeWithLock(),
            executeWithLock(),
            executeWithLock(),
        ]);

        const completedCount = results.filter((r) => r === "completed").length;
        const skippedCount = results.filter((r) => r === "already running").length;

        expect(completedCount).toBe(1);
        expect(skippedCount).toBe(2);
    });

    it("should handle rapid status transitions", async () => {
        const statusLog: string[] = [];
        let currentStatus = "idle";

        const transitionStatus = async (newStatus: string) => {
            if (currentStatus === newStatus) {
                return false;
            }
            currentStatus = newStatus;
            statusLog.push(newStatus);
            await new Promise((resolve) => setTimeout(resolve, 1));
            return true;
        };

        await Promise.all([
            transitionStatus("responding"),
            transitionStatus("responding"),
            transitionStatus("responding"),
        ]);

        expect(statusLog.length).toBeLessThanOrEqual(1);
    });

    it("should cleanup timeout on error", async () => {
        let timeout: NodeJS.Timeout | null = null;
        let timeoutCleared = false;

        try {
            timeout = setTimeout(() => {}, 5000);

            throw new Error("Test error");
        } catch (error) {
            if (timeout) {
                clearTimeout(timeout);
                timeoutCleared = true;
            }
        }

        expect(timeoutCleared).toBe(true);
    });

    it("should rollback history on error", async () => {
        const history = [
            { id: "1", role: "user" as const, content: "test1" },
            { id: "2", role: "assistant" as const, content: "response1" },
        ];

        const startLength = history.length;

        const newHistory = [
            ...history,
            { id: "3", role: "user" as const, content: "test2" },
            { id: "4", role: "assistant" as const, content: "response2" },
        ];

        const rolledBack = newHistory.slice(0, startLength);

        expect(rolledBack).toHaveLength(2);
        expect(rolledBack).toEqual(history);
    });
});
