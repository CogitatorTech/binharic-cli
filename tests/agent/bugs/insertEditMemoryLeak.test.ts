import { describe, expect, it } from "vitest";

describe("Insert Edit Memory Leak Fix", () => {
    function levenshteinDistance(str1: string, str2: string): number {
        const maxLength = 10000;
        if (str1.length > maxLength || str2.length > maxLength) {
            return Math.max(str1.length, str2.length);
        }

        const matrix: number[][] = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1,
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    function calculateSimilarity(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const MAX_COMPARISON_LENGTH = 5000;
        if (longer.length > MAX_COMPARISON_LENGTH) {
            const truncatedLonger = longer.substring(0, MAX_COMPARISON_LENGTH);
            const truncatedShorter = shorter.substring(
                0,
                Math.min(shorter.length, MAX_COMPARISON_LENGTH),
            );
            const editDistance = levenshteinDistance(truncatedLonger, truncatedShorter);
            return (truncatedLonger.length - editDistance) / truncatedLonger.length;
        }

        const editDistance = levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    it("should handle very large strings without excessive memory allocation", () => {
        const largeString1 = "x".repeat(20000);
        const largeString2 = "y".repeat(20000);

        const startMemory = process.memoryUsage().heapUsed;
        const distance = levenshteinDistance(largeString1, largeString2);
        const endMemory = process.memoryUsage().heapUsed;

        expect(distance).toBeGreaterThan(0);

        const memoryIncrease = endMemory - startMemory;
        const maxAllowedIncrease = 50 * 1024 * 1024;
        expect(memoryIncrease).toBeLessThan(maxAllowedIncrease);
    });

    it("should return early for strings exceeding max length", () => {
        const veryLargeString = "a".repeat(15000);
        const smallString = "ab";

        const distance = levenshteinDistance(veryLargeString, smallString);

        expect(distance).toBe(veryLargeString.length);
    });

    it("should truncate strings in similarity calculation when too long", () => {
        const longString1 = "a".repeat(10000);
        const longString2 = "a".repeat(10000);

        const similarity = calculateSimilarity(longString1, longString2);

        expect(similarity).toBeGreaterThan(0);
        expect(similarity).toBeLessThanOrEqual(1);
    });

    it("should handle normal sized strings correctly", () => {
        const str1 = "hello world";
        const str2 = "hello world";

        const distance = levenshteinDistance(str1, str2);

        expect(distance).toBe(0);
    });

    it("should calculate similarity for normal strings", () => {
        const str1 = "kitten";
        const str2 = "sitting";

        const similarity = calculateSimilarity(str1, str2);

        expect(similarity).toBeGreaterThan(0);
        expect(similarity).toBeLessThan(1);
    });

    it("should not crash with extremely large strings", () => {
        const extremelyLarge1 = "x".repeat(50000);
        const extremelyLarge2 = "y".repeat(50000);

        expect(() => {
            levenshteinDistance(extremelyLarge1, extremelyLarge2);
        }).not.toThrow();
    });

    it("should handle empty strings", () => {
        expect(calculateSimilarity("", "")).toBe(1.0);
        expect(calculateSimilarity("hello", "")).toBe(0);
        expect(levenshteinDistance("", "")).toBe(0);
    });

    it("should complete similarity calculation in reasonable time", () => {
        const str1 = "a".repeat(5000);
        const str2 = "b".repeat(5000);

        const startTime = Date.now();
        calculateSimilarity(str1, str2);
        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(5000);
    });
});
