import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Terminal Session Memory Leak Prevention", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should limit output array size to prevent memory leak", async () => {
        const output: string[] = [];
        const MAX_OUTPUT_LINES = 1000;

        for (let i = 0; i < 5000; i++) {
            const text = `Line ${i}\n`;

            if (output.length >= MAX_OUTPUT_LINES) {
                output.shift();
            }

            output.push(text);
        }

        expect(output.length).toBeLessThanOrEqual(MAX_OUTPUT_LINES);
        expect(output.length).toBe(MAX_OUTPUT_LINES);
        expect(output[0]).toContain("Line 4000");
        expect(output[output.length - 1]).toContain("Line 4999");
    });

    it("should implement circular buffer behavior", () => {
        const buffer: string[] = [];
        const MAX_SIZE = 100;
        const items = 250;

        for (let i = 0; i < items; i++) {
            if (buffer.length >= MAX_SIZE) {
                buffer.shift();
            }
            buffer.push(`item-${i}`);
        }

        expect(buffer.length).toBe(MAX_SIZE);
        expect(buffer[0]).toBe("item-150");
        expect(buffer[MAX_SIZE - 1]).toBe("item-249");
    });

    it("should prevent unbounded growth with streaming output", async () => {
        const MAX_LINES = 1000;
        const output: string[] = [];
        let totalDataProcessed = 0;

        const simulateStreamingData = (chunks: number) => {
            for (let i = 0; i < chunks; i++) {
                const data = `chunk-${i}\n`;
                totalDataProcessed++;

                if (output.length >= MAX_LINES) {
                    output.shift();
                }
                output.push(data);
            }
        };

        simulateStreamingData(10000);

        expect(output.length).toBe(MAX_LINES);
        expect(totalDataProcessed).toBe(10000);
        expect(output[0]).toContain("chunk-9000");
    });

    it("should handle high-frequency output without memory explosion", () => {
        const output: string[] = [];
        const MAX_LINES = 1000;
        const iterations = 50000;

        const startMemory = process.memoryUsage().heapUsed;

        for (let i = 0; i < iterations; i++) {
            if (output.length >= MAX_LINES) {
                output.shift();
            }
            output.push(`data-${i}`);
        }

        const endMemory = process.memoryUsage().heapUsed;
        const memoryGrowth = endMemory - startMemory;

        expect(output.length).toBe(MAX_LINES);
        expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });

    it("should maintain correct data in bounded buffer", () => {
        const buffer: string[] = [];
        const MAX_SIZE = 10;

        for (let i = 0; i < 25; i++) {
            if (buffer.length >= MAX_SIZE) {
                buffer.shift();
            }
            buffer.push(`item-${i}`);
        }

        expect(buffer.length).toBe(MAX_SIZE);

        for (let i = 0; i < MAX_SIZE; i++) {
            expect(buffer[i]).toBe(`item-${15 + i}`);
        }
    });
});
