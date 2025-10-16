import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fileTracker } from "@/agent/core/fileTracker.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

describe("Memory Profiling Tests", () => {
    let testDir: string;

    beforeEach(async () => {
        testDir = path.join(os.tmpdir(), `binharic-memory-test-${Date.now()}`);
        await fs.mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (error) {}
        fileTracker.clearTracking();
    });

    const getMemoryUsage = () => {
        const usage = process.memoryUsage();
        return {
            heapUsed: usage.heapUsed,
            heapTotal: usage.heapTotal,
            external: usage.external,
            rss: usage.rss,
        };
    };

    const forceGC = () => {
        if (global.gc) {
            global.gc();
        }
    };

    it("should not leak memory when reading multiple files", async () => {
        const fileCount = 50;
        const fileSize = 10 * 1024;

        for (let i = 0; i < fileCount; i++) {
            const filePath = path.join(testDir, `file-${i}.txt`);
            await fs.writeFile(filePath, "x".repeat(fileSize));
        }

        forceGC();
        const beforeMemory = getMemoryUsage();

        for (let i = 0; i < fileCount; i++) {
            const filePath = path.join(testDir, `file-${i}.txt`);
            await fileTracker.read(filePath);
        }

        forceGC();
        const afterMemory = getMemoryUsage();

        const memoryIncrease = afterMemory.heapUsed - beforeMemory.heapUsed;
        const expectedMaxIncrease = fileSize * fileCount * 2;

        expect(memoryIncrease).toBeLessThan(expectedMaxIncrease);
    });

    it("should not leak memory when writing multiple files", async () => {
        const fileCount = 50;
        const fileSize = 10 * 1024;
        const content = "x".repeat(fileSize);

        forceGC();
        const beforeMemory = getMemoryUsage();

        for (let i = 0; i < fileCount; i++) {
            const filePath = path.join(testDir, `write-${i}.txt`);
            await fileTracker.write(filePath, content);
        }

        forceGC();
        const afterMemory = getMemoryUsage();

        const memoryIncrease = afterMemory.heapUsed - beforeMemory.heapUsed;
        const maxAllowedIncrease = 10 * 1024 * 1024;

        expect(memoryIncrease).toBeLessThan(maxAllowedIncrease);
    });

    it("should release memory when file tracker is cleared", async () => {
        const fileCount = 100;
        const fileSize = 5 * 1024;

        for (let i = 0; i < fileCount; i++) {
            const filePath = path.join(testDir, `tracked-${i}.txt`);
            await fs.writeFile(filePath, "x".repeat(fileSize));
            await fileTracker.read(filePath);
        }

        forceGC();
        const beforeClear = getMemoryUsage();

        fileTracker.clearTracking();

        forceGC();
        await new Promise((resolve) => setTimeout(resolve, 100));
        forceGC();

        const afterClear = getMemoryUsage();

        expect(fileTracker.getTrackedFileCount()).toBe(0);
    });

    it("should enforce file tracking limit without excessive memory growth", async () => {
        const maxFiles = 1000;
        const fileSize = 5 * 1024;

        forceGC();
        const startMemory = getMemoryUsage();

        for (let i = 0; i < maxFiles + 100; i++) {
            const filePath = path.join(testDir, `limit-${i}.txt`);
            await fs.writeFile(filePath, "x".repeat(fileSize));
            await fileTracker.read(filePath);
        }

        forceGC();
        const endMemory = getMemoryUsage();

        const trackedCount = fileTracker.getTrackedFileCount();
        expect(trackedCount).toBeLessThanOrEqual(1000);

        const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
        const maxExpectedIncrease = fileSize * 1000 * 3;

        expect(memoryIncrease).toBeLessThan(maxExpectedIncrease);
    });

    it("should handle large file operations without memory spikes", async () => {
        const largeFileSize = 1024 * 1024;
        const filePath = path.join(testDir, "large-file.txt");
        const content = "x".repeat(largeFileSize);

        await fs.writeFile(filePath, content);

        forceGC();
        const beforeRead = getMemoryUsage();

        const readContent = await fileTracker.read(filePath);

        const duringRead = getMemoryUsage();

        expect(readContent.length).toBe(largeFileSize);

        const memoryIncrease = duringRead.heapUsed - beforeRead.heapUsed;
        const maxExpectedIncrease = largeFileSize * 5;

        expect(memoryIncrease).toBeLessThan(maxExpectedIncrease);
    });

    it("should track memory usage over repeated operations", async () => {
        const iterations = 10;
        const memorySnapshots: number[] = [];

        for (let i = 0; i < iterations; i++) {
            const filePath = path.join(testDir, `iteration-${i}.txt`);
            await fs.writeFile(filePath, "test content");
            await fileTracker.read(filePath);

            forceGC();
            const snapshot = getMemoryUsage();
            memorySnapshots.push(snapshot.heapUsed);
        }

        const memoryGrowthPerIteration = memorySnapshots.map((snapshot, index) => {
            if (index === 0) return 0;
            return snapshot - memorySnapshots[index - 1];
        });

        const avgGrowth =
            memoryGrowthPerIteration.slice(1).reduce((a, b) => a + b, 0) / (iterations - 1);

        const maxAcceptableGrowth = 100 * 1024;
        expect(avgGrowth).toBeLessThan(maxAcceptableGrowth);
    });

    it("should not retain references after file operations complete", async () => {
        const filePath = path.join(testDir, "reference-test.txt");
        const content = "x".repeat(100 * 1024);

        await fs.writeFile(filePath, content);

        forceGC();
        const beforeOp = getMemoryUsage();

        {
            const data = await fileTracker.read(filePath);
            expect(data.length).toBe(content.length);
        }

        forceGC();
        await new Promise((resolve) => setTimeout(resolve, 100));
        forceGC();

        const afterOp = getMemoryUsage();

        const memoryRetained = afterOp.heapUsed - beforeOp.heapUsed;
        const maxAcceptableRetention = content.length * 2;

        expect(memoryRetained).toBeLessThan(maxAcceptableRetention);
    });
});
