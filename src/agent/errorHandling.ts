import logger from "@/logger.js";
import { AISDKError } from "ai";

export interface ErrorContext {
    operation: string;
    step?: number;
    toolName?: string;
    details?: Record<string, unknown>;
}

export function handleAISDKError(error: unknown, context: ErrorContext): never {
    if (error instanceof AISDKError) {
        logger.error("AI SDK Error", {
            operation: context.operation,
            errorType: error.constructor.name,
            message: error.message,
            cause: error.cause,
            ...context.details,
        });

        throw new Error(
            `${context.operation} failed: ${error.message}${
                error.cause ? ` (cause: ${error.cause})` : ""
            }`,
        );
    }

    if (error instanceof Error) {
        logger.error("Unexpected error", {
            operation: context.operation,
            message: error.message,
            stack: error.stack,
            ...context.details,
        });

        throw error;
    }

    logger.error("Unknown error", {
        operation: context.operation,
        error: String(error),
        ...context.details,
    });

    throw new Error(`${context.operation} failed with unknown error: ${String(error)}`);
}

export function isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === "AbortError";
}

export interface StreamErrorHandler {
    onError?: (error: unknown) => void;
    onAbort?: () => void;
    onToolError?: (error: unknown, toolName: string) => void;
}

export async function handleStreamWithErrors<T>(
    stream: AsyncIterable<T>,
    handler: (chunk: T) => Promise<void> | void,
    errorHandler: StreamErrorHandler = {},
): Promise<void> {
    try {
        for await (const chunk of stream) {
            const chunkAny = chunk as any;

            switch (chunkAny.type) {
                case "error": {
                    const error = chunkAny.error;
                    logger.error("Stream error part received", {
                        error: String(error),
                    });

                    if (errorHandler.onError) {
                        errorHandler.onError(error);
                    }
                    break;
                }

                case "abort": {
                    logger.warn("Stream aborted");

                    if (errorHandler.onAbort) {
                        errorHandler.onAbort();
                    }
                    return;
                }

                case "tool-error": {
                    const error = chunkAny.error;
                    const toolName = chunkAny.toolName || "unknown";

                    logger.error("Tool error in stream", {
                        toolName,
                        error: String(error),
                    });

                    if (errorHandler.onToolError) {
                        errorHandler.onToolError(error, toolName);
                    }
                    break;
                }

                default: {
                    await handler(chunk);
                    break;
                }
            }
        }
    } catch (error) {
        if (isAbortError(error)) {
            logger.warn("Stream aborted via exception");
            if (errorHandler.onAbort) {
                errorHandler.onAbort();
            }
            return;
        }

        logger.error("Stream processing error", {
            error: error instanceof Error ? error.message : String(error),
        });

        if (errorHandler.onError) {
            errorHandler.onError(error);
        } else {
            throw error;
        }
    }
}

export interface RetryOptions {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    retryableErrors?: Array<string | RegExp>;
}

export async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {},
): Promise<T> {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        backoffMultiplier = 2,
        retryableErrors = [/rate.*limit/i, /timeout/i, /ECONNRESET/i],
    } = options;

    let lastError: unknown;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            if (attempt === maxRetries) {
                break;
            }

            const errorMessage = error instanceof Error ? error.message : String(error);
            const shouldRetry = retryableErrors.some((pattern) => {
                if (typeof pattern === "string") {
                    return errorMessage.includes(pattern);
                }
                return pattern.test(errorMessage);
            });

            if (!shouldRetry) {
                throw error;
            }

            logger.warn("Operation failed, retrying", {
                attempt: attempt + 1,
                maxRetries,
                delay,
                error: errorMessage,
            });

            await new Promise((resolve) => setTimeout(resolve, delay));
            delay = Math.min(delay * backoffMultiplier, maxDelay);
        }
    }

    throw lastError;
}

export class StreamAbortController {
    private controller: AbortController;
    private abortCallbacks: Array<() => void> = [];

    constructor() {
        this.controller = new AbortController();
    }

    get signal(): AbortSignal {
        return this.controller.signal;
    }

    abort(): void {
        this.controller.abort();
        this.abortCallbacks.forEach((callback) => {
            try {
                callback();
            } catch (error) {
                logger.error("Error in abort callback", {
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        });
    }

    onAbort(callback: () => void): void {
        if (this.signal.aborted) {
            callback();
        } else {
            this.abortCallbacks.push(callback);
            this.signal.addEventListener("abort", callback, { once: true });
        }
    }

    removeAbortCallback(callback: () => void): void {
        this.abortCallbacks = this.abortCallbacks.filter((cb) => cb !== callback);
    }
}

export function createAbortableStream<T>(
    stream: AsyncIterable<T>,
    abortController: StreamAbortController,
): AsyncIterable<T> {
    return {
        async *[Symbol.asyncIterator]() {
            const iterator = stream[Symbol.asyncIterator]();

            try {
                while (true) {
                    if (abortController.signal.aborted) {
                        logger.info("Stream iteration stopped due to abort");
                        break;
                    }

                    const result = await iterator.next();

                    if (result.done) {
                        break;
                    }

                    yield result.value;
                }
            } finally {
                if (typeof iterator.return === "function") {
                    await iterator.return();
                }
            }
        },
    };
}

export interface ErrorRecoveryStrategy {
    shouldRecover: (error: unknown) => boolean;
    recover: (error: unknown) => Promise<void>;
}

export async function executeWithRecovery<T>(
    operation: () => Promise<T>,
    strategies: ErrorRecoveryStrategy[],
): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        for (const strategy of strategies) {
            if (strategy.shouldRecover(error)) {
                logger.info("Attempting error recovery", {
                    error: error instanceof Error ? error.message : String(error),
                });

                try {
                    await strategy.recover(error);
                    return await operation();
                } catch (recoveryError) {
                    logger.warn("Recovery failed", {
                        recoveryError:
                            recoveryError instanceof Error
                                ? recoveryError.message
                                : String(recoveryError),
                    });
                }
            }
        }

        throw error;
    }
}
