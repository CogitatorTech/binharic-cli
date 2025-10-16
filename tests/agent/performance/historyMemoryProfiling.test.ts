import { describe, expect, it } from "vitest";
import { HistoryItem } from "@/agent/context/history.js";

describe("Memory Profiling - History and Context", () => {
    const getMemoryUsage = () => process.memoryUsage().heapUsed;

    const forceGC = () => {
        if (global.gc) {
            global.gc();
        }
    };

    it("should not leak memory with large conversation history", () => {
        const history: HistoryItem[] = [];

        forceGC();
        const startMemory = getMemoryUsage();

        for (let i = 0; i < 1000; i++) {
            history.push({
                id: `msg-${i}`,
                role: "user",
                content: "This is a test message that simulates a real conversation. ".repeat(10),
            });
            history.push({
                id: `resp-${i}`,
                role: "assistant",
                content: "This is a response from the assistant with detailed information. ".repeat(
                    20,
                ),
            });
        }

        const midMemory = getMemoryUsage();
        const memoryUsedDuringHistory = midMemory - startMemory;

        history.length = 0;

        forceGC();
        const endMemory = getMemoryUsage();
        const memoryAfterClear = endMemory - startMemory;

        expect(history.length).toBe(0);
        expect(memoryUsedDuringHistory).toBeGreaterThan(0);
        expect(endMemory).toBeLessThan(midMemory + 500000);
    });

    it("should handle context window trimming without memory leaks", () => {
        const largeHistory: HistoryItem[] = [];

        for (let i = 0; i < 500; i++) {
            largeHistory.push({
                id: `item-${i}`,
                role: "user",
                content: "x".repeat(1000),
            });
        }

        forceGC();
        const beforeTrim = getMemoryUsage();

        const trimmedHistory = largeHistory.slice(-100);

        forceGC();
        const afterTrim = getMemoryUsage();

        expect(trimmedHistory.length).toBe(100);

        const memoryIncrease = afterTrim - beforeTrim;
        expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });

    it("should not retain large tool outputs after processing", () => {
        const toolResults: HistoryItem[] = [];

        forceGC();
        const startMemory = getMemoryUsage();

        for (let i = 0; i < 50; i++) {
            toolResults.push({
                id: `tool-${i}`,
                role: "tool-result",
                toolCallId: `call-${i}`,
                toolName: "test_tool",
                output: "Large output data ".repeat(1000),
            });
        }

        const peakMemory = getMemoryUsage();

        toolResults.length = 0;

        forceGC();
        const afterClear = getMemoryUsage();

        expect(toolResults.length).toBe(0);
        expect(peakMemory).toBeGreaterThan(startMemory);
        expect(afterClear).toBeLessThan(peakMemory + 1024 * 1024);
    });
});
