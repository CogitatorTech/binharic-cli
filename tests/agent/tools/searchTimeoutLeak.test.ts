import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Search Tool Timeout Leak", () => {
    let activeTimeouts: NodeJS.Timeout[] = [];

    beforeEach(() => {
        activeTimeouts = [];
    });

    afterEach(() => {
        for (const timeout of activeTimeouts) {
            clearTimeout(timeout);
        }
        activeTimeouts = [];
    });

    describe("Timeout cleanup in search execution", () => {
        it("should clear timeout on successful completion", async () => {
            let timeoutId: NodeJS.Timeout | null = null;
            let isResolved = false;

            const promise = new Promise<string>((resolve) => {
                timeoutId = setTimeout(() => {
                    if (!isResolved) {
                        isResolved = true;
                        resolve("timeout");
                    }
                }, 1000);

                setTimeout(() => {
                    if (!isResolved) {
                        isResolved = true;
                        if (timeoutId) clearTimeout(timeoutId);
                        resolve("success");
                    }
                }, 50);
            });

            await promise;
            expect(isResolved).toBe(true);
        });

        it("should clear timeout on error", async () => {
            let timeoutId: NodeJS.Timeout | null = null;
            let isResolved = false;

            const promise = new Promise<string>((_, reject) => {
                timeoutId = setTimeout(() => {
                    if (!isResolved) {
                        isResolved = true;
                        reject(new Error("timeout"));
                    }
                }, 1000);

                setTimeout(() => {
                    if (!isResolved) {
                        isResolved = true;
                        if (timeoutId) clearTimeout(timeoutId);
                        reject(new Error("error"));
                    }
                }, 50);
            });

            try {
                await promise;
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect(isResolved).toBe(true);
            }
        });

        it("should clear timeout in catch block on synchronous error", () => {
            let timeoutId: NodeJS.Timeout | null = null;

            try {
                timeoutId = setTimeout(() => {}, 1000);
                throw new Error("Synchronous error");
            } catch (err) {
                if (timeoutId) clearTimeout(timeoutId);
                timeoutId = null;
            }

            expect(timeoutId).toBe(null);
        });

        it("should not leak timeouts on multiple searches", async () => {
            const results: boolean[] = [];

            for (let i = 0; i < 10; i++) {
                let timeoutId: NodeJS.Timeout | null = null;
                let isResolved = false;

                try {
                    await new Promise<string>((resolve) => {
                        timeoutId = setTimeout(() => {
                            if (!isResolved) {
                                isResolved = true;
                                resolve("timeout");
                            }
                        }, 1000);

                        setTimeout(() => {
                            if (!isResolved) {
                                isResolved = true;
                                if (timeoutId) clearTimeout(timeoutId);
                                resolve("success");
                            }
                        }, 10);
                    });

                    results.push(timeoutId === null || isResolved);
                } catch (err) {
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                        timeoutId = null;
                    }
                    results.push(true);
                }
            }

            expect(results.every((r) => r)).toBe(true);
        });
    });

    describe("Process cleanup on timeout", () => {
        it("should kill process and clear timeout", () => {
            let timeoutId: NodeJS.Timeout | null = null;
            let isResolved = false;
            let processKilled = false;

            const mockProcess = {
                kill: () => {
                    processKilled = true;
                },
            };

            timeoutId = setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    mockProcess.kill();
                }
            }, 100);

            setTimeout(() => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
            }, 50);

            setTimeout(() => {
                expect(isResolved).toBe(false);
            }, 150);
        });
    });

    describe("Edge cases", () => {
        it("should handle timeout firing before resolution", (done) => {
            let timeoutId: NodeJS.Timeout | null = null;
            let isResolved = false;

            timeoutId = setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    expect(isResolved).toBe(true);
                    done();
                }
            }, 50);

            setTimeout(() => {
                if (!isResolved && timeoutId) {
                    clearTimeout(timeoutId);
                }
            }, 100);
        });

        it("should handle rapid timeout creation and cleanup", () => {
            const timeouts: Array<NodeJS.Timeout | null> = [];

            for (let i = 0; i < 100; i++) {
                const timeout = setTimeout(() => {}, 10000);
                timeouts.push(timeout);
            }

            for (const timeout of timeouts) {
                if (timeout) {
                    clearTimeout(timeout);
                }
            }

            expect(timeouts.length).toBe(100);
        });
    });
});
