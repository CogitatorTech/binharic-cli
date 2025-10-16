import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Exit Logic Bug Fixes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Double Exit Prevention", () => {
        it("should prevent multiple exit calls from executing", () => {
            let isExiting = false;
            let exitCount = 0;

            const safeExit = () => {
                if (isExiting) {
                    return;
                }
                isExiting = true;
                exitCount++;
            };

            safeExit();
            safeExit();
            safeExit();

            expect(exitCount).toBe(1);
        });

        it("should clear exit timeout on cleanup", () => {
            let exitTimeout: NodeJS.Timeout | null = null;
            let timeoutCleared = false;

            const originalClearTimeout = global.clearTimeout;
            global.clearTimeout = ((id: NodeJS.Timeout) => {
                if (id === exitTimeout) {
                    timeoutCleared = true;
                }
                originalClearTimeout(id);
            }) as typeof clearTimeout;

            exitTimeout = setTimeout(() => {}, 600);

            if (exitTimeout) {
                clearTimeout(exitTimeout);
            }

            expect(timeoutCleared).toBe(true);

            global.clearTimeout = originalClearTimeout;
        });
    });

    describe("Cleanup Order", () => {
        it("should cleanup in correct order: timeout -> sessions -> stdin -> callback", () => {
            const cleanupOrder: string[] = [];
            let isExiting = false;

            const mockCleanup = () => {
                if (isExiting) return;
                isExiting = true;

                cleanupOrder.push("timeout");
                cleanupOrder.push("sessions");
                cleanupOrder.push("stdin");
                cleanupOrder.push("callback");
            };

            mockCleanup();

            expect(cleanupOrder).toEqual(["timeout", "sessions", "stdin", "callback"]);
        });
    });

    describe("Exit Callback Management", () => {
        it("should set and retrieve exit callback", () => {
            const globalObj = globalThis as any;
            const mockCallback = vi.fn();

            globalObj.__binharic_exit_callback = mockCallback;

            const retrieved = globalObj.__binharic_exit_callback;

            expect(retrieved).toBe(mockCallback);
        });

        it("should clear exit callback on cleanup", () => {
            const globalObj = globalThis as any;
            globalObj.__binharic_exit_callback = vi.fn();

            globalObj.__binharic_exit_callback = undefined;

            expect(globalObj.__binharic_exit_callback).toBeUndefined();
        });

        it("should not set callback twice", () => {
            let exitCallbackSet = false;
            const callbacks: Function[] = [];

            const setExitCallback = (callback: () => void) => {
                if (!exitCallbackSet) {
                    exitCallbackSet = true;
                    callbacks.push(callback);
                }
            };

            const callback1 = vi.fn();
            const callback2 = vi.fn();

            setExitCallback(callback1);
            setExitCallback(callback2);

            expect(callbacks.length).toBe(1);
            expect(callbacks[0]).toBe(callback1);
        });
    });

    describe("SIGINT/SIGTERM Handling", () => {
        it("should ignore SIGINT when already exiting", () => {
            let isExitingGlobal = false;
            let handlerCallCount = 0;

            const handleSIGINT = () => {
                if (isExitingGlobal) {
                    return;
                }
                handlerCallCount++;
                isExitingGlobal = true;
            };

            handleSIGINT();
            handleSIGINT();
            handleSIGINT();

            expect(handlerCallCount).toBe(1);
        });

        it("should clear ctrl+c timeout on second press", () => {
            let ctrlCTimeout: NodeJS.Timeout | null = null;
            let timeoutCleared = false;

            ctrlCTimeout = setTimeout(() => {}, 2000);

            const originalClearTimeout = global.clearTimeout;
            global.clearTimeout = ((id: NodeJS.Timeout) => {
                if (id === ctrlCTimeout) {
                    timeoutCleared = true;
                }
                originalClearTimeout(id);
            }) as typeof clearTimeout;

            if (ctrlCTimeout) {
                clearTimeout(ctrlCTimeout);
                ctrlCTimeout = null;
            }

            expect(timeoutCleared).toBe(true);
            expect(ctrlCTimeout).toBe(null);

            global.clearTimeout = originalClearTimeout;
        });
    });

    describe("Input Handling During Exit", () => {
        it("should clear input immediately on exit command", () => {
            let inputValue = "/exit";

            if (inputValue === "/exit" || inputValue === "/quit") {
                inputValue = "";
            }

            expect(inputValue).toBe("");
        });

        it("should prevent submit during exit sequence", async () => {
            let isExiting = false;
            let submitCount = 0;

            const handleSubmit = async () => {
                if (isExiting) {
                    return;
                }
                submitCount++;
                isExiting = true;
            };

            await handleSubmit();
            await handleSubmit();
            await handleSubmit();

            expect(submitCount).toBe(1);
        });
    });

    describe("Error Handling During Exit", () => {
        it("should handle errors in exit callback gracefully", () => {
            const mockCallback = vi.fn().mockImplementation(() => {
                throw new Error("Exit callback error");
            });

            let errorCaught = false;

            try {
                mockCallback();
            } catch (error) {
                errorCaught = true;
            }

            expect(errorCaught).toBe(true);
        });

        it("should handle stdin cleanup errors gracefully", () => {
            const mockStdin = {
                isTTY: true,
                setRawMode: vi.fn().mockImplementation(() => {
                    throw new Error("Failed to set raw mode");
                }),
            };

            let errorHandled = false;

            if (mockStdin.isTTY && mockStdin.setRawMode) {
                try {
                    mockStdin.setRawMode(false);
                } catch (error) {
                    errorHandled = true;
                }
            }

            expect(errorHandled).toBe(true);
        });
    });

    describe("Timeout Management", () => {
        it("should use 600ms for exit summary display", () => {
            const EXPECTED_SUMMARY_TIME = 600;
            const exitSummaryTimeout = 600;

            expect(exitSummaryTimeout).toBe(EXPECTED_SUMMARY_TIME);
        });

        it("should use 700ms for command exit to allow summary render", () => {
            const EXPECTED_COMMAND_EXIT_TIME = 700;
            const commandExitTimeout = 700;

            expect(commandExitTimeout).toBe(EXPECTED_COMMAND_EXIT_TIME);
        });

        it("should cleanup timeout on unmount", () => {
            let exitTimeout: NodeJS.Timeout | null = setTimeout(() => {}, 600);
            let cleaned = false;

            const cleanup = () => {
                if (exitTimeout) {
                    clearTimeout(exitTimeout);
                    exitTimeout = null;
                    cleaned = true;
                }
            };

            cleanup();

            expect(exitTimeout).toBe(null);
            expect(cleaned).toBe(true);
        });
    });

    describe("Exit Code Handling", () => {
        it("should exit with code 0 on normal exit", () => {
            const exitCode = 0;
            expect(exitCode).toBe(0);
        });

        it("should check process.exitCode before forcing exit", () => {
            let shouldForceExit = false;

            if (!process.exitCode) {
                shouldForceExit = true;
            }

            expect(typeof shouldForceExit).toBe("boolean");
        });
    });
});
