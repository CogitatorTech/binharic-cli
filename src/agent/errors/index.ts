export class AppError extends Error {
    constructor(
        message: string,
        public readonly code?: string,
        public readonly details?: Record<string, unknown>,
    ) {
        super(message);
        this.name = "AppError";
        Object.setPrototypeOf(this, new.target.prototype);
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            details: this.details,
            stack: this.stack,
        };
    }
}

export class FatalError extends AppError {
    constructor(message: string, code?: string, details?: Record<string, unknown>) {
        super(message, code, details);
        this.name = "FatalError";
        Object.setPrototypeOf(this, FatalError.prototype);
    }
}

export class TransientError extends AppError {
    constructor(
        message: string,
        public readonly retryAfter?: number,
        code?: string,
        details?: Record<string, unknown>,
    ) {
        super(message, code, details);
        this.name = "TransientError";
        Object.setPrototypeOf(this, TransientError.prototype);
    }

    toJSON() {
        return {
            ...super.toJSON(),
            retryAfter: this.retryAfter,
        };
    }
}

export class ToolError extends AppError {
    constructor(message: string, code?: string, details?: Record<string, unknown>) {
        super(message, code, details);
        this.name = "ToolError";
        Object.setPrototypeOf(this, ToolError.prototype);
    }
}

export class ValidationError extends AppError {
    constructor(
        message: string,
        public readonly validationErrors: string[],
        code?: string,
        details?: Record<string, unknown>,
    ) {
        super(message, code, details);
        this.name = "ValidationError";
        Object.setPrototypeOf(this, ValidationError.prototype);
    }

    toJSON() {
        return {
            ...super.toJSON(),
            validationErrors: this.validationErrors,
        };
    }
}

export class FileExistsError extends AppError {
    constructor(message: string, code?: string, details?: Record<string, unknown>) {
        super(message, code, details);
        this.name = "FileExistsError";
        Object.setPrototypeOf(this, FileExistsError.prototype);
    }
}

export class FileOutdatedError extends AppError {
    constructor(message: string, code?: string, details?: Record<string, unknown>) {
        super(message, code, details);
        this.name = "FileOutdatedError";
        Object.setPrototypeOf(this, FileOutdatedError.prototype);
    }
}

export function isRetryableError(error: unknown): boolean {
    if (error instanceof TransientError) {
        return true;
    }

    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
            message.includes("timeout") ||
            message.includes("rate limit") ||
            message.includes("429") ||
            message.includes("503") ||
            message.includes("connection reset") ||
            message.includes("econnreset") ||
            message.includes("network error")
        );
    }

    return false;
}

export function getRetryDelay(error: unknown): number {
    if (error instanceof TransientError && error.retryAfter) {
        return error.retryAfter;
    }

    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes("rate limit")) {
            return 60000;
        }
    }

    return 1000;
}
