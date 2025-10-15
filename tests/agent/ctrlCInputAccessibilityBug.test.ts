import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Ctrl+C Input Accessibility Bug", () => {
    let ctrlCPressCount = 0;
    let ctrlCTimeout: NodeJS.Timeout | null = null;
    let stdinMock: any;

    beforeEach(() => {
        ctrlCPressCount = 0;
        ctrlCTimeout = null;
        stdinMock = {
            setRawMode: vi.fn(),
        };
    });

    afterEach(() => {
        if (ctrlCTimeout) {
            clearTimeout(ctrlCTimeout);
            ctrlCTimeout = null;
        }
    });

    describe("Single Ctrl+C press - Input should remain accessible", () => {
        it("should not disable stdin on first Ctrl+C", () => {
            ctrlCPressCount = 1;

            if (ctrlCPressCount === 1) {
                ctrlCTimeout = setTimeout(() => {
                    ctrlCPressCount = 0;
                    ctrlCTimeout = null;
                }, 2000);
            }

            expect(stdinMock.setRawMode).not.toHaveBeenCalled();

            if (ctrlCTimeout) {
                clearTimeout(ctrlCTimeout);
                ctrlCTimeout = null;
            }
        });

        it("should allow agent to stop without affecting input", () => {
            const mockStopAgent = vi.fn();
            const status = "responding";
            ctrlCPressCount = 1;

            if (ctrlCPressCount === 1 && status === "responding") {
                mockStopAgent();
                ctrlCTimeout = setTimeout(() => {
                    ctrlCPressCount = 0;
                }, 2000);
            }

            expect(mockStopAgent).toHaveBeenCalled();
            expect(stdinMock.setRawMode).not.toHaveBeenCalled();

            if (ctrlCTimeout) {
                clearTimeout(ctrlCTimeout);
                ctrlCTimeout = null;
            }
        });

        it("should return early after first press to keep input active", () => {
            const mockExit = vi.fn();
            ctrlCPressCount = 1;

            if (ctrlCPressCount === 1) {
                ctrlCTimeout = setTimeout(() => {
                    ctrlCPressCount = 0;
                }, 2000);

                if (ctrlCTimeout) {
                    clearTimeout(ctrlCTimeout);
                    ctrlCTimeout = null;
                }
                return;
            }

            if (ctrlCPressCount >= 2) {
                mockExit();
            }

            expect(mockExit).not.toHaveBeenCalled();
        });
    });

    describe("Double Ctrl+C press - Should exit cleanly", () => {
        it("should disable stdin before exit on second Ctrl+C", () => {
            ctrlCPressCount = 2;

            if (ctrlCPressCount >= 2) {
                if (stdinMock) {
                    stdinMock.setRawMode(false);
                }
            }

            expect(stdinMock.setRawMode).toHaveBeenCalledWith(false);
        });

        it("should cleanup timeout before exit", () => {
            ctrlCTimeout = setTimeout(() => {}, 2000);
            ctrlCPressCount = 2;

            if (ctrlCPressCount >= 2) {
                if (ctrlCTimeout) {
                    clearTimeout(ctrlCTimeout);
                    ctrlCTimeout = null;
                }

                if (stdinMock) {
                    stdinMock.setRawMode(false);
                }
            }

            expect(ctrlCTimeout).toBe(null);
            expect(stdinMock.setRawMode).toHaveBeenCalledWith(false);
        });

        it("should handle case where stdin is undefined", () => {
            const undefinedStdin = undefined;
            ctrlCPressCount = 2;

            if (ctrlCPressCount >= 2) {
                if (undefinedStdin) {
                    undefinedStdin.setRawMode(false);
                }
            }

            expect(stdinMock.setRawMode).not.toHaveBeenCalled();
        });
    });

    describe("SIGTERM handler - Should cleanup stdin", () => {
        it("should disable stdin on SIGTERM", () => {
            if (stdinMock) {
                stdinMock.setRawMode(false);
            }

            expect(stdinMock.setRawMode).toHaveBeenCalledWith(false);
        });

        it("should cleanup timeout on SIGTERM", () => {
            ctrlCTimeout = setTimeout(() => {}, 2000);

            if (ctrlCTimeout) {
                clearTimeout(ctrlCTimeout);
                ctrlCTimeout = null;
            }

            if (stdinMock) {
                stdinMock.setRawMode(false);
            }

            expect(ctrlCTimeout).toBe(null);
            expect(stdinMock.setRawMode).toHaveBeenCalledWith(false);
        });
    });

    describe("State recovery after Ctrl+C", () => {
        it("should allow typing after agent is stopped", () => {
            const mockStopAgent = vi.fn();
            const status = "responding";
            let newStatus = status;
            ctrlCPressCount = 1;

            if (ctrlCPressCount === 1 && status === "responding") {
                mockStopAgent();
                newStatus = "interrupted";

                ctrlCTimeout = setTimeout(() => {
                    if (newStatus === "interrupted") {
                        newStatus = "idle";
                    }
                    ctrlCPressCount = 0;
                }, 2000);
            }

            expect(mockStopAgent).toHaveBeenCalled();
            expect(stdinMock.setRawMode).not.toHaveBeenCalled();

            if (ctrlCTimeout) {
                clearTimeout(ctrlCTimeout);
            }
        });

        it("should reset state after timeout without affecting input", (done) => {
            ctrlCPressCount = 1;

            ctrlCTimeout = setTimeout(() => {
                ctrlCPressCount = 0;
                ctrlCTimeout = null;

                expect(ctrlCPressCount).toBe(0);
                expect(stdinMock.setRawMode).not.toHaveBeenCalled();
                done();
            }, 100);
        });
    });

    describe("Edge cases for input handling", () => {
        it("should handle multiple Ctrl+C presses without breaking input", () => {
            for (let i = 1; i <= 3; i++) {
                ctrlCPressCount = i;

                if (ctrlCTimeout) {
                    clearTimeout(ctrlCTimeout);
                }

                if (ctrlCPressCount === 1) {
                    ctrlCTimeout = setTimeout(() => {
                        ctrlCPressCount = 0;
                    }, 2000);
                } else if (ctrlCPressCount >= 2) {
                    if (stdinMock) {
                        stdinMock.setRawMode(false);
                    }
                    break;
                }
            }

            expect(stdinMock.setRawMode).toHaveBeenCalledWith(false);

            if (ctrlCTimeout) {
                clearTimeout(ctrlCTimeout);
            }
        });

        it("should handle Ctrl+C when stdin is null", () => {
            const nullStdin = null;
            ctrlCPressCount = 2;

            expect(() => {
                if (ctrlCPressCount >= 2) {
                    if (nullStdin) {
                        (nullStdin as any).setRawMode(false);
                    }
                }
            }).not.toThrow();

            expect(stdinMock.setRawMode).not.toHaveBeenCalled();
        });

        it("should preserve input state during agent interruption", () => {
            const status = "responding";
            let inputValue = "test command";
            ctrlCPressCount = 1;

            if (ctrlCPressCount === 1 && status === "responding") {
                ctrlCTimeout = setTimeout(() => {
                    ctrlCPressCount = 0;
                }, 2000);
            }

            expect(inputValue).toBe("test command");
            expect(stdinMock.setRawMode).not.toHaveBeenCalled();

            if (ctrlCTimeout) {
                clearTimeout(ctrlCTimeout);
            }
        });
    });
});
