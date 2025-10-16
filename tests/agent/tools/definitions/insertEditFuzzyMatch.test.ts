import { describe, expect, it } from "vitest";

function calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
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

describe("InsertEdit Fuzzy Matching", () => {
    describe("Levenshtein Distance", () => {
        it("should return 0 for identical strings", () => {
            expect(levenshteinDistance("hello", "hello")).toBe(0);
            expect(levenshteinDistance("test", "test")).toBe(0);
        });

        it("should calculate single character difference", () => {
            expect(levenshteinDistance("hello", "hallo")).toBe(1);
            expect(levenshteinDistance("test", "best")).toBe(1);
        });

        it("should calculate multiple character differences", () => {
            expect(levenshteinDistance("kitten", "sitting")).toBe(3);
            expect(levenshteinDistance("saturday", "sunday")).toBe(3);
        });

        it("should handle insertions and deletions", () => {
            expect(levenshteinDistance("hello", "helo")).toBe(1);
            expect(levenshteinDistance("world", "wworld")).toBe(1);
        });

        it("should handle completely different strings", () => {
            const dist = levenshteinDistance("abc", "xyz");
            expect(dist).toBe(3);
        });

        it("should handle empty strings", () => {
            expect(levenshteinDistance("", "hello")).toBe(5);
            expect(levenshteinDistance("hello", "")).toBe(5);
            expect(levenshteinDistance("", "")).toBe(0);
        });
    });

    describe("Similarity Calculation", () => {
        it("should return 1.0 for identical strings", () => {
            expect(calculateSimilarity("hello", "hello")).toBe(1.0);
            expect(calculateSimilarity("test code", "test code")).toBe(1.0);
        });

        it("should return high similarity for minor differences", () => {
            const sim = calculateSimilarity("function test()", "function best()");
            expect(sim).toBeGreaterThan(0.8);
        });

        it("should return low similarity for major differences", () => {
            const sim = calculateSimilarity("function test()", "const x = 5;");
            expect(sim).toBeLessThan(0.5);
        });

        it("should handle different length strings", () => {
            const sim = calculateSimilarity("hello world", "hello");
            expect(sim).toBeGreaterThan(0.4);
            expect(sim).toBeLessThan(0.6);
        });

        it("should be symmetric", () => {
            const sim1 = calculateSimilarity("abc", "abcd");
            const sim2 = calculateSimilarity("abcd", "abc");
            expect(sim1).toBe(sim2);
        });

        it("should handle code-like patterns", () => {
            const original = "function hello() {\n  console.log('hi');\n}";
            const similar = "function hello() {\n  console.log('hello');\n}";
            const sim = calculateSimilarity(original, similar);
            expect(sim).toBeGreaterThan(0.7);
        });

        it("should detect whitespace differences", () => {
            const sim = calculateSimilarity("hello world", "hello  world");
            expect(sim).toBeGreaterThan(0.9);
        });
    });

    describe("Fuzzy Match Threshold", () => {
        const THRESHOLD = 0.7;

        it("should match with minor typos above threshold", () => {
            const sim = calculateSimilarity(
                "const result = calculate();",
                "const resultt = calculate();",
            );
            expect(sim).toBeGreaterThanOrEqual(THRESHOLD);
        });

        it("should reject completely different code below threshold", () => {
            const sim = calculateSimilarity("const result = calculate();", "if (true) { return; }");
            expect(sim).toBeLessThan(THRESHOLD);
        });

        it("should match similar function signatures", () => {
            const sim = calculateSimilarity(
                "function test(param1, param2)",
                "function test(param1, param3)",
            );
            expect(sim).toBeGreaterThanOrEqual(THRESHOLD);
        });

        it("should handle indentation differences gracefully", () => {
            const original = "  function test() {";
            const withDifferentIndent = "    function test() {";
            const sim = calculateSimilarity(original, withDifferentIndent);
            expect(sim).toBeGreaterThan(0.8);
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty strings", () => {
            expect(calculateSimilarity("", "")).toBe(1.0);
            expect(calculateSimilarity("hello", "")).toBe(0);
            expect(calculateSimilarity("", "hello")).toBe(0);
        });

        it("should handle very long strings efficiently", () => {
            const long1 = "a".repeat(1000);
            const long2 = "a".repeat(999) + "b";

            const start = Date.now();
            const sim = calculateSimilarity(long1, long2);
            const duration = Date.now() - start;

            expect(sim).toBeGreaterThan(0.99);
            expect(duration).toBeLessThan(1000);
        });

        it("should handle special characters", () => {
            const sim = calculateSimilarity(
                "const x = { a: 1, b: 2 };",
                "const x = { a: 1, b: 3 };",
            );
            expect(sim).toBeGreaterThan(0.9);
        });

        it("should handle multiline strings", () => {
            const str1 = "line1\nline2\nline3";
            const str2 = "line1\nline2\nline4";
            const sim = calculateSimilarity(str1, str2);
            expect(sim).toBeGreaterThan(0.7);
        });
    });
});
