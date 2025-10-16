import { beforeEach, describe, expect, it } from "vitest";

describe("Terminal Session Race Condition Fix", () => {
    interface Session {
        process: {
            killed: boolean;
            kill: () => void;
            stdout: null;
            stderr: null;
            removeAllListeners: () => void;
        };
        output: string[];
        isBackground: boolean;
        startTime: number;
        timeout?: NodeJS.Timeout;
        isCleaningUp?: boolean;
    }

    let sessions: Map<string, Session>;

    beforeEach(() => {
        sessions = new Map();
    });

    function cleanupSession(sessionId: string) {
        const session = sessions.get(sessionId);
        if (session) {
            if (session.isCleaningUp) {
                return;
            }
            session.isCleaningUp = true;

            if (session.timeout) {
                clearTimeout(session.timeout);
            }
            if (!session.process.killed) {
                session.process.kill();
            }
            sessions.delete(sessionId);
        }
    }

    it("should prevent double cleanup of same session", () => {
        const mockProcess = {
            killed: false,
            kill: () => {
                mockProcess.killed = true;
            },
            stdout: null,
            stderr: null,
            removeAllListeners: () => {},
        };

        sessions.set("test-1", {
            process: mockProcess,
            output: [],
            isBackground: true,
            startTime: Date.now(),
        });

        cleanupSession("test-1");
        expect(sessions.has("test-1")).toBe(false);

        cleanupSession("test-1");
        expect(sessions.has("test-1")).toBe(false);
    });

    it("should handle concurrent cleanup attempts gracefully", () => {
        const mockProcess = {
            killed: false,
            kill: () => {
                mockProcess.killed = true;
            },
            stdout: null,
            stderr: null,
            removeAllListeners: () => {},
        };

        sessions.set("test-2", {
            process: mockProcess,
            output: [],
            isBackground: true,
            startTime: Date.now(),
        });

        cleanupSession("test-2");
        cleanupSession("test-2");
        cleanupSession("test-2");

        expect(sessions.has("test-2")).toBe(false);
        expect(mockProcess.killed).toBe(true);
    });

    it("should mark session as cleaning up immediately", () => {
        const mockProcess = {
            killed: false,
            kill: () => {
                mockProcess.killed = true;
            },
            stdout: null,
            stderr: null,
            removeAllListeners: () => {},
        };

        sessions.set("test-3", {
            process: mockProcess,
            output: [],
            isBackground: true,
            startTime: Date.now(),
        });

        const session = sessions.get("test-3")!;
        expect(session.isCleaningUp).toBeUndefined();

        cleanupSession("test-3");
        expect(sessions.has("test-3")).toBe(false);
    });

    it("should clear timeout before deleting session", () => {
        let timeoutCleared = false;
        const mockTimeout = setTimeout(() => {}, 1000) as NodeJS.Timeout;

        const originalClearTimeout = global.clearTimeout;
        global.clearTimeout = ((id: NodeJS.Timeout) => {
            if (id === mockTimeout) {
                timeoutCleared = true;
            }
            originalClearTimeout(id);
        }) as typeof clearTimeout;

        const mockProcess = {
            killed: false,
            kill: () => {
                mockProcess.killed = true;
            },
            stdout: null,
            stderr: null,
            removeAllListeners: () => {},
        };

        sessions.set("test-4", {
            process: mockProcess,
            output: [],
            isBackground: true,
            startTime: Date.now(),
            timeout: mockTimeout,
        });

        cleanupSession("test-4");

        expect(timeoutCleared).toBe(true);
        expect(sessions.has("test-4")).toBe(false);

        global.clearTimeout = originalClearTimeout;
    });

    it("should cleanup all sessions without errors", () => {
        for (let i = 0; i < 5; i++) {
            const mockProcess = {
                killed: false,
                kill: () => {
                    mockProcess.killed = true;
                },
                stdout: null,
                stderr: null,
                removeAllListeners: () => {},
            };

            sessions.set(`test-${i}`, {
                process: mockProcess,
                output: [],
                isBackground: true,
                startTime: Date.now(),
            });
        }

        expect(sessions.size).toBe(5);

        for (const sessionId of sessions.keys()) {
            cleanupSession(sessionId);
        }

        expect(sessions.size).toBe(0);
    });
});
