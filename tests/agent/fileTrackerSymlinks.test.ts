import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FileTracker } from "@/agent/fileTracker.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

describe("FileTracker - Symbolic Links and Special Files", () => {
    let tracker: FileTracker;
    let testDir: string;

    beforeEach(async () => {
        tracker = new FileTracker();
        testDir = path.join(os.tmpdir(), `filetracker-test-${Date.now()}`);
        await fs.mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
        await fs.rm(testDir, { recursive: true, force: true });
    });

    it("should handle symbolic links correctly", async () => {
        const realFile = path.join(testDir, "real.txt");
        const symlink = path.join(testDir, "symlink.txt");

        await fs.writeFile(realFile, "real content");
        await fs.symlink(realFile, symlink);

        const content = await tracker.read(symlink);
        expect(content).toBe("real content");
    });

    it("should reject directories", async () => {
        const dir = path.join(testDir, "subdir");
        await fs.mkdir(dir);

        await expect(tracker.read(dir)).rejects.toThrow("Path is a directory, not a file");
    });

    it("should handle file tracking limit correctly", async () => {
        const MAX_FILES = 1000;

        for (let i = 0; i < MAX_FILES + 10; i++) {
            const file = path.join(testDir, `file${i}.txt`);
            await fs.writeFile(file, `content ${i}`);
            await tracker.read(file);
        }

        expect(tracker.getTrackedFileCount()).toBeLessThanOrEqual(MAX_FILES);
    });

    it("should validate file path before write operations", async () => {
        const file = path.join(testDir, "test.txt");
        await tracker.write(file, "content");

        const content = await fs.readFile(file, "utf8");
        expect(content).toBe("content");
    });

    it("should handle concurrent read operations", async () => {
        const file = path.join(testDir, "concurrent.txt");
        await fs.writeFile(file, "test content");

        const reads = await Promise.all([
            tracker.read(file),
            tracker.read(file),
            tracker.read(file),
        ]);

        reads.forEach((content) => {
            expect(content).toBe("test content");
        });
    });
});
