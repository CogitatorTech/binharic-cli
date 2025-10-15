import { describe, expect, it } from "vitest";
import {
    AppError,
    FatalError,
    getRetryDelay,
    isRetryableError,
    ToolError,
    TransientError,
    ValidationError,
} from "../../src/agent/errors/index.js";

describe("Error Type Hierarchy", () => {
    describe("AppError Base Class", () => {
        it("should create basic error", () => {
            const error = new AppError("Test error");
            expect(error.message).toBe("Test error");
            expect(error.name).toBe("AppError");
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(AppError);
        });

        it("should include error code", () => {
            const error = new AppError("Test error", "ERR_TEST");
            expect(error.code).toBe("ERR_TEST");
        });

        it("should include details", () => {
            const error = new AppError("Test error", "ERR_TEST", { key: "value" });
            expect(error.details).toEqual({ key: "value" });
        });

        it("should serialize to JSON", () => {
            const error = new AppError("Test error", "ERR_TEST", { key: "value" });
            const json = error.toJSON();

            expect(json.name).toBe("AppError");
            expect(json.message).toBe("Test error");
            expect(json.code).toBe("ERR_TEST");
            expect(json.details).toEqual({ key: "value" });
            expect(json.stack).toBeDefined();
        });
    });

    describe("FatalError", () => {
        it("should create fatal error", () => {
            const error = new FatalError("Fatal error");
            expect(error.message).toBe("Fatal error");
            expect(error.name).toBe("FatalError");
            expect(error).toBeInstanceOf(FatalError);
            expect(error).toBeInstanceOf(AppError);
        });

        it("should maintain prototype chain", () => {
            const error = new FatalError("Fatal error");
            expect(error instanceof FatalError).toBe(true);
            expect(error instanceof AppError).toBe(true);
            expect(error instanceof Error).toBe(true);
        });
    });

    describe("TransientError", () => {
        it("should create transient error", () => {
            const error = new TransientError("Transient error");
            expect(error.message).toBe("Transient error");
            expect(error.name).toBe("TransientError");
            expect(error).toBeInstanceOf(TransientError);
        });

        it("should include retry delay", () => {
            const error = new TransientError("Transient error", 5000);
            expect(error.retryAfter).toBe(5000);
        });

        it("should serialize with retry delay", () => {
            const error = new TransientError("Transient error", 5000);
            const json = error.toJSON();

            expect(json.retryAfter).toBe(5000);
            expect(json.message).toBe("Transient error");
        });
    });

    describe("ToolError", () => {
        it("should create tool error", () => {
            const error = new ToolError("Tool error");
            expect(error.message).toBe("Tool error");
            expect(error.name).toBe("ToolError");
            expect(error).toBeInstanceOf(ToolError);
        });
    });

    describe("ValidationError", () => {
        it("should create validation error", () => {
            const errors = ["Field required", "Invalid format"];
            const error = new ValidationError("Validation failed", errors);

            expect(error.message).toBe("Validation failed");
            expect(error.name).toBe("ValidationError");
            expect(error.validationErrors).toEqual(errors);
        });

        it("should serialize with validation errors", () => {
            const errors = ["Field required", "Invalid format"];
            const error = new ValidationError("Validation failed", errors);
            const json = error.toJSON();

            expect(json.validationErrors).toEqual(errors);
        });
    });

    describe("isRetryableError", () => {
        it("should identify TransientError as retryable", () => {
            const error = new TransientError("Timeout");
            expect(isRetryableError(error)).toBe(true);
        });

        it("should identify timeout errors as retryable", () => {
            const error = new Error("Request timeout");
            expect(isRetryableError(error)).toBe(true);
        });

        it("should identify rate limit errors as retryable", () => {
            const error = new Error("Rate limit exceeded");
            expect(isRetryableError(error)).toBe(true);
        });

        it("should identify 429 errors as retryable", () => {
            const error = new Error("HTTP 429 Too Many Requests");
            expect(isRetryableError(error)).toBe(true);
        });

        it("should identify 503 errors as retryable", () => {
            const error = new Error("HTTP 503 Service Unavailable");
            expect(isRetryableError(error)).toBe(true);
        });

        it("should identify connection reset as retryable", () => {
            const error = new Error("Connection reset by peer");
            expect(isRetryableError(error)).toBe(true);
        });

        it("should identify ECONNRESET as retryable", () => {
            const error = new Error("ECONNRESET");
            expect(isRetryableError(error)).toBe(true);
        });

        it("should identify network errors as retryable", () => {
            const error = new Error("Network error occurred");
            expect(isRetryableError(error)).toBe(true);
        });

        it("should not identify FatalError as retryable", () => {
            const error = new FatalError("Fatal error");
            expect(isRetryableError(error)).toBe(false);
        });

        it("should not identify other errors as retryable", () => {
            const error = new Error("Invalid input");
            expect(isRetryableError(error)).toBe(false);
        });

        it("should handle non-Error objects", () => {
            expect(isRetryableError("string error")).toBe(false);
            expect(isRetryableError(null)).toBe(false);
            expect(isRetryableError(undefined)).toBe(false);
        });
    });

    describe("getRetryDelay", () => {
        it("should return custom delay from TransientError", () => {
            const error = new TransientError("Error", 5000);
            expect(getRetryDelay(error)).toBe(5000);
        });

        it("should return longer delay for rate limit errors", () => {
            const error = new Error("Rate limit exceeded");
            expect(getRetryDelay(error)).toBe(60000);
        });

        it("should return default delay for other errors", () => {
            const error = new Error("Timeout");
            expect(getRetryDelay(error)).toBe(1000);
        });

        it("should handle non-Error objects", () => {
            expect(getRetryDelay("error")).toBe(1000);
            expect(getRetryDelay(null)).toBe(1000);
        });

        it("should prioritize TransientError retry delay", () => {
            const error = new TransientError("Rate limit", 30000);
            expect(getRetryDelay(error)).toBe(30000);
        });
    });
});
