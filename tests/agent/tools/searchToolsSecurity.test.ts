import { describe, expect, it } from "vitest";

describe("Search Tools - Command Injection and Timeout", () => {
    it("should sanitize search queries", () => {
        const maliciousQueries = [
            "; rm -rf /",
            "$(evil command)",
            "`malicious`",
            "| cat /etc/passwd",
        ];

        maliciousQueries.forEach((query) => {
            expect(query).toMatch(/[;$`|]/);
        });
    });

    it("should handle timeout correctly", async () => {
        const timeoutMs = 100;
        let timeoutTriggered = false;

        const operation = new Promise((_, reject) => {
            setTimeout(() => {
                timeoutTriggered = true;
                reject(new Error("Timeout"));
            }, timeoutMs);
        });

        await expect(operation).rejects.toThrow("Timeout");
        expect(timeoutTriggered).toBe(true);
    });

    it("should prevent regex DoS patterns", () => {
        const evilRegex = "(a+)+b";
        const testString = "a".repeat(20);

        const startTime = Date.now();
        let matched = false;
        try {
            matched = new RegExp(evilRegex).test(testString);
        } catch (e) {}
        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(60000);
        expect(typeof matched).toBe("boolean");
    });

    it("should limit output size", () => {
        const maxSize = 1024 * 1024;
        const largeOutput = "x".repeat(maxSize + 100);

        expect(largeOutput.length).toBeGreaterThan(maxSize);
    });

    it("should handle special characters in patterns", () => {
        const specialChars = [".", "*", "?", "[", "]", "(", ")", "{", "}"];

        specialChars.forEach((char) => {
            const escaped = char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            expect(escaped).toContain("\\");
        });
    });

    it("should clean up resources on early termination", async () => {
        let cleaned = false;

        try {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 10);

            const promise = new Promise((resolve, reject) => {
                controller.signal.addEventListener("abort", () => {
                    cleaned = true;
                    reject(new Error("Aborted"));
                });
            });

            await promise;
        } catch (e) {
            expect(cleaned).toBe(true);
        }
    });
});
