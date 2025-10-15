export function handleAISDKError(
    error: unknown,
    context?: { operation?: string; step?: number; toolName?: string },
): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const contextInfo = context
        ? ` (operation: ${context.operation}, step: ${context.step}, tool: ${context.toolName})`
        : "";
    throw new Error(`${errorMessage}${contextInfo}`);
}

export function isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === "AbortError";
}

interface StreamChunk {
    type: string;
    value?: unknown;
    error?: Error;
    toolName?: string;
}

interface StreamHandlers {
    onError?: (error: Error) => void;
    onAbort?: () => void;
    onToolError?: (error: Error, toolName: string) => void;
}

export async function handleStreamWithErrors(
    stream: AsyncIterable<StreamChunk>,
    handler: (chunk: StreamChunk) => void,
    handlers?: StreamHandlers,
): Promise<void> {
    try {
        for await (const chunk of stream) {
            if (chunk.type === "error" && chunk.error) {
                handlers?.onError?.(chunk.error);
            } else if (chunk.type === "abort") {
                handlers?.onAbort?.();
            } else if (chunk.type === "tool-error" && chunk.error && chunk.toolName) {
                handlers?.onToolError?.(chunk.error, chunk.toolName);
            } else {
                handler(chunk);
            }
        }
    } catch (error) {
        if (error instanceof Error) {
            handlers?.onError?.(error);
        }
    }
}

interface RetryOptions {
    maxRetries?: number;
    initialDelay?: number;
    retryableErrors?: RegExp[];
}

export async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    options?: RetryOptions,
): Promise<T> {
    const maxRetries = options?.maxRetries ?? 3;
    const initialDelay = options?.initialDelay ?? 1000;
    const retryableErrors = options?.retryableErrors ?? [/.*/];

    let lastError: Error;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            const isRetryable = retryableErrors.some((pattern) => pattern.test(lastError.message));

            if (!isRetryable || attempt === maxRetries) {
                throw lastError;
            }

            const delay = initialDelay * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
}

export class StreamAbortController {
    private abortController: AbortController;
    private callbacks: Set<() => void>;

    constructor() {
        this.abortController = new AbortController();
        this.callbacks = new Set();
    }

    get signal() {
        return this.abortController.signal;
    }

    abort(): void {
        this.abortController.abort();
        this.callbacks.forEach((callback) => callback());
    }

    onAbort(callback: () => void): void {
        if (this.signal.aborted) {
            callback();
        } else {
            this.callbacks.add(callback);
        }
    }
}

export async function* createAbortableStream<T>(
    stream: AsyncIterable<T>,
    controller: StreamAbortController,
): AsyncGenerator<T> {
    for await (const chunk of stream) {
        if (controller.signal.aborted) {
            return;
        }
        yield chunk;
    }
}

interface RecoveryStrategy {
    shouldRecover: (error: unknown) => boolean;
    recover: () => Promise<void>;
}

export async function executeWithRecovery<T>(
    operation: () => Promise<T>,
    strategies: RecoveryStrategy[],
): Promise<T> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            return await operation();
        } catch (error) {
            const strategy = strategies.find((s) => s.shouldRecover(error));
            if (!strategy) {
                throw error;
            }
            await strategy.recover();
        }
    }
}
