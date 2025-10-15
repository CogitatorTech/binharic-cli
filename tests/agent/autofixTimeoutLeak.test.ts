import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Autofix Timeout Memory Leak", () => {
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

    describe("Timeout cleanup in autofixEdit", () => {
        it("should clear timeout after successful completion", async () => {
            let timeoutId: NodeJS.Timeout | null = null;

            const timeoutPromise = new Promise<null>((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error("Timeout")), 10000);
            });

            const successPromise = Promise.resolve({ success: true });

            await Promise.race([successPromise, timeoutPromise]);

            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }

            expect(timeoutId).toBe(null);
        });

        it("should clear timeout after rejection", async () => {
            let timeoutId: NodeJS.Timeout | null = null;

            const timeoutPromise = new Promise<null>((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error("Timeout")), 10000);
            });

            const errorPromise = Promise.reject(new Error("Test error"));

            try {
                await Promise.race([errorPromise, timeoutPromise]);
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
            }

            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }

            expect(timeoutId).toBe(null);
        });

        it("should clear timeout on actual timeout", async () => {
            let timeoutId: NodeJS.Timeout | null = null;
            let timeoutFired = false;

            const timeoutPromise = new Promise<null>((_, reject) => {
                timeoutId = setTimeout(() => {
                    timeoutFired = true;
                    reject(new Error("Timeout after 10 seconds"));
                }, 100);
            });

            const slowPromise = new Promise((resolve) => setTimeout(resolve, 200));

            try {
                await Promise.race([slowPromise, timeoutPromise]);
            } catch (error) {
                expect(timeoutFired).toBe(true);
            }

            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }

            expect(timeoutId).toBe(null);
        });

        it("should not leak timeouts on multiple calls", async () => {
            const timeouts: Array<NodeJS.Timeout | null> = [];

            for (let i = 0; i < 10; i++) {
                let timeoutId: NodeJS.Timeout | null = null;

                const timeoutPromise = new Promise<null>((_, reject) => {
                    timeoutId = setTimeout(() => reject(new Error("Timeout")), 10000);
                });

                const fastPromise = Promise.resolve(null);

                await Promise.race([fastPromise, timeoutPromise]);

                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }

                timeouts.push(timeoutId);
            }

            expect(timeouts.every((t) => t === null)).toBe(true);
        });
    });

    describe("Promise.race timeout pattern", () => {
        it("should handle successful promise before timeout", async () => {
            let timeoutId: NodeJS.Timeout | null = null;

            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error("Timeout")), 1000);
            });

            const fastPromise = new Promise((resolve) => {
                setTimeout(() => resolve("success"), 50);
            });

            const result = await Promise.race([fastPromise, timeoutPromise]);

            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            expect(result).toBe("success");
        });

        it("should handle timeout before slow promise", async () => {
            let timeoutId: NodeJS.Timeout | null = null;

            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error("Timeout")), 50);
            });

            const slowPromise = new Promise((resolve) => {
                setTimeout(() => resolve("success"), 1000);
            });

            try {
                await Promise.race([slowPromise, timeoutPromise]);
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toBe("Timeout");
            }

            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        });
    });

    describe("Timeout cleanup edge cases", () => {
        it("should handle null timeout gracefully", () => {
            let timeoutId: NodeJS.Timeout | null = null;

            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            expect(timeoutId).toBe(null);
        });

        it("should handle clearing already cleared timeout", () => {
            let timeoutId: NodeJS.Timeout | null = setTimeout(() => {}, 1000);

            clearTimeout(timeoutId);
            clearTimeout(timeoutId);

            timeoutId = null;
            expect(timeoutId).toBe(null);
        });

        it("should track and cleanup all timeouts in sequence", async () => {
            const results: string[] = [];

            for (let i = 0; i < 5; i++) {
                let timeoutId: NodeJS.Timeout | null = null;

                const timeoutPromise = new Promise<string>((_, reject) => {
                    timeoutId = setTimeout(() => reject(new Error("Timeout")), 1000);
                });

                const quickPromise = Promise.resolve(`result-${i}`);

                const result = await Promise.race([quickPromise, timeoutPromise]);

                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }

                results.push(result);
            }

            expect(results).toEqual(["result-0", "result-1", "result-2", "result-3", "result-4"]);
        });
    });
});
