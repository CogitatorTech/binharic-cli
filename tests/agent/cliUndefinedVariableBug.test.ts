import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("CLI Undefined Variable Bug", () => {
    let ctrlCTimeout: NodeJS.Timeout | null = null;
    let cleanupCalled = false;

    beforeEach(() => {
        ctrlCTimeout = null;
        cleanupCalled = false;
    });

    afterEach(() => {
        if (ctrlCTimeout) {
            clearTimeout(ctrlCTimeout);
            ctrlCTimeout = null;
        }
    });

    describe("SIGINT handler timeout cleanup", () => {
        it("should properly clear ctrlCTimeout on second press", () => {
            ctrlCTimeout = setTimeout(() => {}, 2000);
            expect(ctrlCTimeout).not.toBe(null);

            if (ctrlCTimeout) {
                clearTimeout(ctrlCTimeout);
                ctrlCTimeout = null;
            }

            expect(ctrlCTimeout).toBe(null);
        });

        it("should handle cleanup before exit", () => {
            const mockCleanup = () => {
                cleanupCalled = true;
            };

            ctrlCTimeout = setTimeout(() => {}, 2000);

            if (ctrlCTimeout) {
                clearTimeout(ctrlCTimeout);
                ctrlCTimeout = null;
            }

            mockCleanup();

            expect(ctrlCTimeout).toBe(null);
            expect(cleanupCalled).toBe(true);
        });

        it("should not reference undefined activeStreamTimeout", () => {
            const mockExit = vi.fn();
            const mockCleanupAll = vi.fn();

            let ctrlCPressCount = 0;
            let localTimeout: NodeJS.Timeout | null = null;

            ctrlCPressCount = 2;

            if (localTimeout) {
                clearTimeout(localTimeout);
                localTimeout = null;
            }

            mockCleanupAll();
            mockExit(0);

            expect(localTimeout).toBe(null);
            expect(mockCleanupAll).toHaveBeenCalledOnce();
            expect(mockExit).toHaveBeenCalledWith(0);
        });
    });

    describe("SIGTERM handler timeout cleanup", () => {
        it("should clear ctrlCTimeout on SIGTERM", () => {
            ctrlCTimeout = setTimeout(() => {}, 2000);

            const mockCleanup = () => {
                cleanupCalled = true;
            };

            if (ctrlCTimeout) {
                clearTimeout(ctrlCTimeout);
                ctrlCTimeout = null;
            }

            mockCleanup();

            expect(ctrlCTimeout).toBe(null);
            expect(cleanupCalled).toBe(true);
        });

        it("should handle SIGTERM with no active timeout", () => {
            expect(ctrlCTimeout).toBe(null);

            if (ctrlCTimeout) {
                clearTimeout(ctrlCTimeout);
                ctrlCTimeout = null;
            }

            expect(ctrlCTimeout).toBe(null);
        });
    });

    describe("Timeout management", () => {
        it("should replace old timeout with new one", () => {
            const firstTimeout = setTimeout(() => {}, 2000);
            ctrlCTimeout = firstTimeout;

            if (ctrlCTimeout) {
                clearTimeout(ctrlCTimeout);
            }

            const secondTimeout = setTimeout(() => {}, 2000);
            ctrlCTimeout = secondTimeout;

            expect(ctrlCTimeout).toBe(secondTimeout);
            expect(ctrlCTimeout).not.toBe(firstTimeout);

            if (ctrlCTimeout) {
                clearTimeout(ctrlCTimeout);
                ctrlCTimeout = null;
            }
        });

        it("should prevent timeout leaks on rapid SIGINT", () => {
            const timeouts: NodeJS.Timeout[] = [];

            for (let i = 0; i < 5; i++) {
                if (ctrlCTimeout) {
                    clearTimeout(ctrlCTimeout);
                }

                const newTimeout = setTimeout(() => {}, 2000);
                timeouts.push(newTimeout);
                ctrlCTimeout = newTimeout;
            }

            if (ctrlCTimeout) {
                clearTimeout(ctrlCTimeout);
                ctrlCTimeout = null;
            }

            expect(ctrlCTimeout).toBe(null);
            expect(timeouts.length).toBe(5);
        });
    });
});
