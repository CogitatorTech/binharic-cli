import { describe, expect, it } from "vitest";

describe("Grep Search Input Validation Bug Fix", () => {
    const validateGrepInput = (query: string, includePattern?: string) => {
        if (!query || query.trim().length === 0) {
            throw new Error("Search query cannot be empty");
        }

        if (query.length > 1000) {
            throw new Error("Search query exceeds maximum length of 1000 characters");
        }

        if (includePattern && includePattern.length > 500) {
            throw new Error("Include pattern exceeds maximum length of 500 characters");
        }
    };

    it("should reject empty query", () => {
        expect(() => validateGrepInput("")).toThrow("Search query cannot be empty");
        expect(() => validateGrepInput("   ")).toThrow("Search query cannot be empty");
    });

    it("should reject excessively long query", () => {
        const longQuery = "a".repeat(1001);
        expect(() => validateGrepInput(longQuery)).toThrow("Search query exceeds maximum length");
    });

    it("should accept query at maximum length", () => {
        const maxQuery = "a".repeat(1000);
        expect(() => validateGrepInput(maxQuery)).not.toThrow();
    });

    it("should reject excessively long include pattern", () => {
        const longPattern = "a".repeat(501);
        expect(() => validateGrepInput("test", longPattern)).toThrow(
            "Include pattern exceeds maximum length",
        );
    });

    it("should accept include pattern at maximum length", () => {
        const maxPattern = "a".repeat(500);
        expect(() => validateGrepInput("test", maxPattern)).not.toThrow();
    });

    it("should accept valid inputs", () => {
        expect(() => validateGrepInput("test")).not.toThrow();
        expect(() => validateGrepInput("test", "*.ts")).not.toThrow();
        expect(() => validateGrepInput("function", "**/*.js")).not.toThrow();
    });

    it("should handle special characters in query", () => {
        expect(() => validateGrepInput("test$")).not.toThrow();
        expect(() => validateGrepInput("^start")).not.toThrow();
        expect(() => validateGrepInput("test.*end")).not.toThrow();
    });

    it("should handle unicode in query", () => {
        expect(() => validateGrepInput("测试")).not.toThrow();
        expect(() => validateGrepInput("тест")).not.toThrow();
        expect(() => validateGrepInput("🔍")).not.toThrow();
    });
});
