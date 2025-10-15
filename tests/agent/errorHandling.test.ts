import { describe, expect, it, vi } from "vitest";
import {
    createAbortableStream,
    executeWithRecovery,
    handleAISDKError,
    handleStreamWithErrors,
    isAbortError,
    retryWithBackoff,
    StreamAbortController,
} from "@/agent/errors/errorHandling.js";

describe("Error Handling Module", () => {
    describe("handleAISDKError", () => {
        it("should handle AI SDK errors", () => {
            const error = new Error("API rate limit exceeded");
            error.name = "APICallError";

            expect(() => handleAISDKError(error, { operation: "generateText" })).toThrow(
                "API rate limit exceeded",
            );
        });

        it("should handle regular errors", () => {
            const error = new Error("Network failure");

            expect(() => handleAISDKError(error, { operation: "streamText" })).toThrow(
                "Network failure",
            );
        });

        it("should include context in error", () => {
            const error = new Error("Test error");

            expect(() =>
                handleAISDKError(error, {
                    operation: "test",
                    step: 5,
                    toolName: "read_file",
                }),
            ).toThrow();
        });
    });

    describe("isAbortError", () => {
        it("should identify abort errors", () => {
            const error = new Error("Aborted");
            error.name = "AbortError";

            expect(isAbortError(error)).toBe(true);
        });

        it("should return false for non-abort errors", () => {
            const error = new Error("Regular error");

            expect(isAbortError(error)).toBe(false);
        });
    });

    describe("handleStreamWithErrors", () => {
        it("should handle normal stream chunks", async () => {
            const chunks = [
                { type: "text", value: "Hello" },
                { type: "text", value: " World" },
            ];

            const handler = vi.fn();
            await handleStreamWithErrors(
                (async function* () {
                    for (const chunk of chunks) {
                        yield chunk;
                    }
                })(),
                handler,
            );

            expect(handler).toHaveBeenCalledTimes(2);
        });

        it("should handle error chunks", async () => {
            const onError = vi.fn();

            await handleStreamWithErrors(
                (async function* () {
                    yield { type: "error", error: new Error("Stream error") };
                })(),
                vi.fn(),
                { onError },
            );

            expect(onError).toHaveBeenCalled();
        });

        it("should handle abort chunks", async () => {
            const onAbort = vi.fn();

            await handleStreamWithErrors(
                (async function* () {
                    yield { type: "abort" };
                })(),
                vi.fn(),
                { onAbort },
            );

            expect(onAbort).toHaveBeenCalled();
        });

        it("should handle tool-error chunks", async () => {
            const onToolError = vi.fn();

            await handleStreamWithErrors(
                (async function* () {
                    yield {
                        type: "tool-error",
                        error: new Error("Tool failed"),
                        toolName: "search",
                    };
                })(),
                vi.fn(),
                { onToolError },
            );

            expect(onToolError).toHaveBeenCalledWith(expect.any(Error), "search");
        });

        it("should handle stream exceptions", async () => {
            const onError = vi.fn();

            await handleStreamWithErrors(
                (async function* () {
                    throw new Error("Stream exception");
                })(),
                vi.fn(),
                { onError },
            );

            expect(onError).toHaveBeenCalled();
        });
    });

    describe("retryWithBackoff", () => {
        it("should succeed on first try", async () => {
            const operation = vi.fn(async () => "success");

            const result = await retryWithBackoff(operation);

            expect(result).toBe("success");
            expect(operation).toHaveBeenCalledTimes(1);
        });

        it("should retry on retryable errors", async () => {
            let attempts = 0;
            const operation = vi.fn(async () => {
                attempts++;
                if (attempts < 2) {
                    throw new Error("Rate limit exceeded");
                }
                return "success";
            });

            const result = await retryWithBackoff(operation, {
                maxRetries: 3,
                initialDelay: 10,
            });

            expect(result).toBe("success");
            expect(operation).toHaveBeenCalledTimes(2);
        });

        it("should not retry non-retryable errors", async () => {
            const operation = vi.fn(async () => {
                throw new Error("Invalid API key");
            });

            await expect(
                retryWithBackoff(operation, {
                    maxRetries: 3,
                    retryableErrors: [/rate.*limit/i],
                }),
            ).rejects.toThrow("Invalid API key");

            expect(operation).toHaveBeenCalledTimes(1);
        });

        it("should exhaust retries and throw", async () => {
            const operation = vi.fn(async () => {
                throw new Error("Rate limit exceeded");
            });

            await expect(
                retryWithBackoff(operation, {
                    maxRetries: 2,
                    initialDelay: 10,
                }),
            ).rejects.toThrow("Rate limit exceeded");

            expect(operation).toHaveBeenCalledTimes(3);
        });
    });

    describe("StreamAbortController", () => {
        it("should create abort controller", () => {
            const controller = new StreamAbortController();

            expect(controller.signal).toBeDefined();
            expect(controller.signal.aborted).toBe(false);
        });

        it("should abort stream", () => {
            const controller = new StreamAbortController();
            const callback = vi.fn();

            controller.onAbort(callback);
            controller.abort();

            expect(controller.signal.aborted).toBe(true);
            expect(callback).toHaveBeenCalled();
        });

        it("should call callback immediately if already aborted", () => {
            const controller = new StreamAbortController();
            controller.abort();

            const callback = vi.fn();
            controller.onAbort(callback);

            expect(callback).toHaveBeenCalled();
        });
    });

    describe("createAbortableStream", () => {
        it("should yield all chunks when not aborted", async () => {
            const chunks = ["a", "b", "c"];
            const controller = new StreamAbortController();

            const stream = createAbortableStream(
                (async function* () {
                    for (const chunk of chunks) {
                        yield chunk;
                    }
                })(),
                controller,
            );

            const results = [];
            for await (const chunk of stream) {
                results.push(chunk);
            }

            expect(results).toEqual(chunks);
        });

        it("should stop yielding when aborted", async () => {
            const controller = new StreamAbortController();

            const stream = createAbortableStream(
                (async function* () {
                    yield "a";
                    yield "b";
                    yield "c";
                })(),
                controller,
            );

            const results = [];
            const iterator = stream[Symbol.asyncIterator]();

            results.push((await iterator.next()).value);
            controller.abort();

            const next = await iterator.next();
            expect(next.done).toBe(true);
            expect(results).toEqual(["a"]);
        });
    });

    describe("executeWithRecovery", () => {
        it("should succeed without recovery", async () => {
            const operation = vi.fn(async () => "success");

            const result = await executeWithRecovery(operation, []);

            expect(result).toBe("success");
            expect(operation).toHaveBeenCalledTimes(1);
        });

        it("should recover from errors", async () => {
            let attempts = 0;
            const operation = vi.fn(async () => {
                attempts++;
                if (attempts === 1) {
                    throw new Error("Recoverable error");
                }
                return "success";
            });

            const strategy = {
                shouldRecover: (error: unknown) =>
                    error instanceof Error && error.message.includes("Recoverable"),
                recover: vi.fn(async () => {}),
            };

            const result = await executeWithRecovery(operation, [strategy]);

            expect(result).toBe("success");
            expect(operation).toHaveBeenCalledTimes(2);
            expect(strategy.recover).toHaveBeenCalled();
        });

        it("should throw if recovery fails", async () => {
            const operation = vi.fn(async () => {
                throw new Error("Unrecoverable error");
            });

            const strategy = {
                shouldRecover: () => false,
                recover: vi.fn(async () => {}),
            };

            await expect(executeWithRecovery(operation, [strategy])).rejects.toThrow(
                "Unrecoverable error",
            );

            expect(strategy.recover).not.toHaveBeenCalled();
        });
    });
});
