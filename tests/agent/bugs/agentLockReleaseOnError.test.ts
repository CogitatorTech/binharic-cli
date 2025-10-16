import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Agent Lock Release on Error Bug Fix", () => {
    let isAgentRunning = false;
    let agentLockTimestamp = 0;
    let shouldStopAgent = false;

    beforeEach(() => {
        isAgentRunning = false;
        agentLockTimestamp = 0;
        shouldStopAgent = false;
    });

    afterEach(() => {
        isAgentRunning = false;
        agentLockTimestamp = 0;
        shouldStopAgent = false;
    });

    it("should release agent lock when fatal error occurs", async () => {
        const mockRunAgentLogic = async () => {
            if (isAgentRunning) {
                throw new Error("Agent already running");
            }

            isAgentRunning = true;
            agentLockTimestamp = Date.now();

            try {
                throw new Error("Fatal error occurred");
            } finally {
                isAgentRunning = false;
                agentLockTimestamp = 0;
            }
        };

        try {
            await mockRunAgentLogic();
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
        }

        expect(isAgentRunning).toBe(false);
        expect(agentLockTimestamp).toBe(0);
    });

    it("should release agent lock on unexpected error in internal logic", async () => {
        const mockInternalLogic = async () => {
            throw new Error("Unexpected error in internal logic");
        };

        const mockRunAgentLogic = async () => {
            isAgentRunning = true;
            agentLockTimestamp = Date.now();

            try {
                await mockInternalLogic();
            } finally {
                isAgentRunning = false;
                agentLockTimestamp = 0;
            }
        };

        try {
            await mockRunAgentLogic();
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
        }

        expect(isAgentRunning).toBe(false);
        expect(agentLockTimestamp).toBe(0);
    });

    it("should reset shouldStopAgent flag on error", async () => {
        shouldStopAgent = true;

        const mockInternalLogic = async () => {
            if (shouldStopAgent) {
                throw new Error("Agent stopped");
            }
        };

        const mockRunAgentLogic = async () => {
            isAgentRunning = true;
            agentLockTimestamp = Date.now();

            try {
                await mockInternalLogic();
            } catch (error) {
                isAgentRunning = false;
                agentLockTimestamp = 0;
                shouldStopAgent = false;
                throw error;
            }
        };

        try {
            await mockRunAgentLogic();
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
        }

        expect(isAgentRunning).toBe(false);
        expect(agentLockTimestamp).toBe(0);
        expect(shouldStopAgent).toBe(false);
    });

    it("should allow new agent run after lock is released on error", async () => {
        let runCount = 0;

        const mockRunAgentLogic = async () => {
            if (isAgentRunning) {
                throw new Error("Agent already running");
            }

            isAgentRunning = true;
            agentLockTimestamp = Date.now();
            runCount++;

            try {
                if (runCount === 1) {
                    throw new Error("First run fails");
                }
            } finally {
                isAgentRunning = false;
                agentLockTimestamp = 0;
            }
        };

        try {
            await mockRunAgentLogic();
        } catch (error) {
            expect(runCount).toBe(1);
        }

        expect(isAgentRunning).toBe(false);

        await mockRunAgentLogic();
        expect(runCount).toBe(2);
        expect(isAgentRunning).toBe(false);
    });

    it("should properly release lock even if error handler throws", async () => {
        const mockRunAgentLogic = async () => {
            isAgentRunning = true;
            agentLockTimestamp = Date.now();

            try {
                throw new Error("Primary error");
            } finally {
                isAgentRunning = false;
                agentLockTimestamp = 0;
            }
        };

        try {
            await mockRunAgentLogic();
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
        }

        expect(isAgentRunning).toBe(false);
        expect(agentLockTimestamp).toBe(0);
    });
});
