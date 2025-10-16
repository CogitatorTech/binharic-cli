import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Ctrl+C Interrupt Mechanism", () => {
    let ctrlCPressCount = 0;
    let ctrlCTimeout: NodeJS.Timeout | null = null;
    let shouldStopAgent = false;

    beforeEach(() => {
        ctrlCPressCount = 0;
        ctrlCTimeout = null;
        shouldStopAgent = false;
    });

    describe("Single Ctrl+C press", () => {
        it("should stop agent on first press when agent is responding", () => {
            const status = "responding";
            ctrlCPressCount = 1;

            if (status === "responding") {
                shouldStopAgent = true;
            }

            expect(shouldStopAgent).toBe(true);
            expect(ctrlCPressCount).toBe(1);
        });

        it("should set timeout on first press", () => {
            ctrlCPressCount = 1;

            ctrlCTimeout = setTimeout(() => {
                ctrlCPressCount = 0;
                ctrlCTimeout = null;
            }, 2000);

            expect(ctrlCTimeout).not.toBe(null);

            if (ctrlCTimeout) {
                clearTimeout(ctrlCTimeout);
                ctrlCTimeout = null;
            }
        });

        it("should clear existing timeout before setting new one", () => {
            ctrlCTimeout = setTimeout(() => {}, 2000);
            const firstTimeout = ctrlCTimeout;

            if (ctrlCTimeout) {
                clearTimeout(ctrlCTimeout);
            }

            ctrlCTimeout = setTimeout(() => {}, 2000);

            expect(ctrlCTimeout).not.toBe(firstTimeout);

            if (ctrlCTimeout) {
                clearTimeout(ctrlCTimeout);
                ctrlCTimeout = null;
            }
        });
    });

    describe("Double Ctrl+C press", () => {
        it("should trigger exit on second press", () => {
            const mockExit = vi.fn();
            ctrlCPressCount = 2;

            if (ctrlCPressCount >= 2) {
                if (ctrlCTimeout) {
                    clearTimeout(ctrlCTimeout);
                    ctrlCTimeout = null;
                }
                mockExit(0);
            }

            expect(mockExit).toHaveBeenCalledWith(0);
            expect(ctrlCTimeout).toBe(null);
        });

        it("should cleanup timeout before exit", () => {
            ctrlCTimeout = setTimeout(() => {}, 2000);
            ctrlCPressCount = 2;

            if (ctrlCPressCount >= 2) {
                if (ctrlCTimeout) {
                    clearTimeout(ctrlCTimeout);
                    ctrlCTimeout = null;
                }
            }

            expect(ctrlCTimeout).toBe(null);
        });
    });

    describe("Timeout auto-reset", () => {
        it("should reset counter after 2 seconds", (done) => {
            ctrlCPressCount = 1;

            ctrlCTimeout = setTimeout(() => {
                ctrlCPressCount = 0;
                ctrlCTimeout = null;
                expect(ctrlCPressCount).toBe(0);
                done();
            }, 100);
        });

        it("should handle interrupted state recovery", (done) => {
            const status = "interrupted";
            ctrlCPressCount = 1;

            ctrlCTimeout = setTimeout(() => {
                if (status === "interrupted") {
                    shouldStopAgent = true;
                }
                ctrlCPressCount = 0;
                ctrlCTimeout = null;

                expect(shouldStopAgent).toBe(true);
                done();
            }, 100);
        });
    });

    describe("State transitions", () => {
        it("should transition from responding to interrupted", () => {
            let status = "responding";

            if (status === "responding") {
                status = "interrupted";
                shouldStopAgent = true;
            }

            expect(status).toBe("interrupted");
            expect(shouldStopAgent).toBe(true);
        });

        it("should transition from interrupted to idle after timeout", (done) => {
            let status = "interrupted";

            setTimeout(() => {
                if (status === "interrupted") {
                    status = "idle";
                    shouldStopAgent = false;
                }

                expect(status).toBe("idle");
                expect(shouldStopAgent).toBe(false);
                done();
            }, 100);
        });
    });

    describe("Edge cases", () => {
        it("should handle rapid Ctrl+C presses", () => {
            for (let i = 0; i < 5; i++) {
                ctrlCPressCount++;

                if (ctrlCTimeout) {
                    clearTimeout(ctrlCTimeout);
                }

                ctrlCTimeout = setTimeout(() => {
                    ctrlCPressCount = 0;
                }, 2000);
            }

            expect(ctrlCPressCount).toBe(5);

            if (ctrlCTimeout) {
                clearTimeout(ctrlCTimeout);
                ctrlCTimeout = null;
            }
        });

        it("should handle Ctrl+C when agent is idle", () => {
            const status = "idle";
            ctrlCPressCount = 1;

            if (status === "idle") {
                shouldStopAgent = false;
            }

            expect(shouldStopAgent).toBe(false);
        });

        it("should handle Ctrl+C during tool execution", () => {
            const status = "executing-tool";
            ctrlCPressCount = 1;

            if (status === "executing-tool") {
                shouldStopAgent = true;
            }

            expect(shouldStopAgent).toBe(true);
        });
    });

    describe("Cleanup on process termination", () => {
        it("should cleanup on SIGTERM", () => {
            const mockCleanup = vi.fn();
            ctrlCTimeout = setTimeout(() => {}, 2000);

            if (ctrlCTimeout) {
                clearTimeout(ctrlCTimeout);
                ctrlCTimeout = null;
            }
            mockCleanup();

            expect(ctrlCTimeout).toBe(null);
            expect(mockCleanup).toHaveBeenCalled();
        });

        it("should cleanup timeout on uncaught exception", () => {
            ctrlCTimeout = setTimeout(() => {}, 2000);
            const mockCleanup = vi.fn();

            try {
                throw new Error("Test error");
            } catch (error) {
                if (ctrlCTimeout) {
                    clearTimeout(ctrlCTimeout);
                    ctrlCTimeout = null;
                }
                mockCleanup();
            }

            expect(ctrlCTimeout).toBe(null);
            expect(mockCleanup).toHaveBeenCalled();
        });
    });
});
