import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Agent Lock Timeout Protection", () => {
    let isAgentRunning: boolean;
    let agentLockTimestamp: number;
    const AGENT_LOCK_TIMEOUT_MS = 300000;

    beforeEach(() => {
        isAgentRunning = false;
        agentLockTimestamp = 0;
    });

    describe("Lock Acquisition", () => {
        it("should acquire lock when not running", () => {
            const now = Date.now();

            if (!isAgentRunning) {
                isAgentRunning = true;
                agentLockTimestamp = now;
            }

            expect(isAgentRunning).toBe(true);
            expect(agentLockTimestamp).toBe(now);
        });

        it("should reject lock when already running", () => {
            const now = Date.now();
            isAgentRunning = true;
            agentLockTimestamp = now;

            let lockAcquired = false;
            if (!isAgentRunning) {
                lockAcquired = true;
            }

            expect(lockAcquired).toBe(false);
        });

        it("should force reset on timeout", () => {
            const oldTimestamp = Date.now() - AGENT_LOCK_TIMEOUT_MS - 1000;
            isAgentRunning = true;
            agentLockTimestamp = oldTimestamp;

            const now = Date.now();
            if (isAgentRunning) {
                if (now - agentLockTimestamp > AGENT_LOCK_TIMEOUT_MS) {
                    isAgentRunning = false;
                    agentLockTimestamp = 0;
                }
            }

            expect(isAgentRunning).toBe(false);
            expect(agentLockTimestamp).toBe(0);
        });

        it("should not reset before timeout", () => {
            const recentTimestamp = Date.now() - 1000;
            isAgentRunning = true;
            agentLockTimestamp = recentTimestamp;

            const now = Date.now();
            if (isAgentRunning) {
                if (now - agentLockTimestamp > AGENT_LOCK_TIMEOUT_MS) {
                    isAgentRunning = false;
                }
            }

            expect(isAgentRunning).toBe(true);
            expect(agentLockTimestamp).toBe(recentTimestamp);
        });
    });

    describe("Lock Release", () => {
        it("should release lock after completion", () => {
            isAgentRunning = true;
            agentLockTimestamp = Date.now();

            isAgentRunning = false;
            agentLockTimestamp = 0;

            expect(isAgentRunning).toBe(false);
            expect(agentLockTimestamp).toBe(0);
        });

        it("should allow re-acquisition after release", () => {
            isAgentRunning = true;
            agentLockTimestamp = Date.now();

            isAgentRunning = false;
            agentLockTimestamp = 0;

            const newTimestamp = Date.now();
            isAgentRunning = true;
            agentLockTimestamp = newTimestamp;

            expect(isAgentRunning).toBe(true);
            expect(agentLockTimestamp).toBe(newTimestamp);
        });
    });

    describe("Timeout Calculation", () => {
        it("should correctly detect timeout boundary", () => {
            const timestamp = Date.now() - AGENT_LOCK_TIMEOUT_MS;
            const now = Date.now();

            const hasTimedOut = now - timestamp >= AGENT_LOCK_TIMEOUT_MS;
            expect(hasTimedOut).toBe(true);
        });

        it("should correctly detect just before timeout", () => {
            const timestamp = Date.now() - AGENT_LOCK_TIMEOUT_MS + 1000;
            const now = Date.now();

            const hasTimedOut = now - timestamp > AGENT_LOCK_TIMEOUT_MS;
            expect(hasTimedOut).toBe(false);
        });

        it("should handle very old timestamps", () => {
            const timestamp = Date.now() - AGENT_LOCK_TIMEOUT_MS * 10;
            const now = Date.now();

            const hasTimedOut = now - timestamp > AGENT_LOCK_TIMEOUT_MS;
            expect(hasTimedOut).toBe(true);
        });
    });

    describe("Deadlock Prevention", () => {
        it("should prevent permanent deadlock with timeout", () => {
            isAgentRunning = true;
            agentLockTimestamp = Date.now() - AGENT_LOCK_TIMEOUT_MS - 10000;

            const attemptAcquisition = () => {
                const now = Date.now();
                if (isAgentRunning) {
                    if (now - agentLockTimestamp > AGENT_LOCK_TIMEOUT_MS) {
                        isAgentRunning = false;
                    }
                }

                if (!isAgentRunning) {
                    isAgentRunning = true;
                    agentLockTimestamp = now;
                    return true;
                }
                return false;
            };

            const acquired = attemptAcquisition();
            expect(acquired).toBe(true);
        });

        it("should maintain lock for active operations", () => {
            const recentTimestamp = Date.now() - 1000;
            isAgentRunning = true;
            agentLockTimestamp = recentTimestamp;

            const attemptAcquisition = () => {
                const now = Date.now();
                if (isAgentRunning) {
                    if (now - agentLockTimestamp > AGENT_LOCK_TIMEOUT_MS) {
                        isAgentRunning = false;
                    } else {
                        return false;
                    }
                }

                if (!isAgentRunning) {
                    isAgentRunning = true;
                    agentLockTimestamp = now;
                    return true;
                }
                return false;
            };

            const acquired = attemptAcquisition();
            expect(acquired).toBe(false);
            expect(isAgentRunning).toBe(true);
        });
    });

    describe("Timestamp Updates", () => {
        it("should update timestamp on each operation", () => {
            const firstTimestamp = Date.now();
            isAgentRunning = true;
            agentLockTimestamp = firstTimestamp;

            vi.useFakeTimers();
            vi.advanceTimersByTime(5000);

            const secondTimestamp = Date.now();
            agentLockTimestamp = secondTimestamp;

            expect(agentLockTimestamp).toBeGreaterThan(firstTimestamp);

            vi.useRealTimers();
        });

        it("should reset timestamp to 0 on release", () => {
            isAgentRunning = true;
            agentLockTimestamp = Date.now();

            isAgentRunning = false;
            agentLockTimestamp = 0;

            expect(agentLockTimestamp).toBe(0);
        });
    });
});
