import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileTracker } from "@/agent/core/fileTracker.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

describe("FileTracker Memory Leak Fix", () => {
    let tracker: FileTracker;
    let testDir: string;

    beforeEach(async () => {
        tracker = new FileTracker();
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), "filetracker-test-"));
    });

    afterEach(async () => {
        tracker.clearTracking();
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (error) {}
    });

    it("should limit tracked files to MAX_TRACKED_FILES", async () => {
        const maxFiles = 1000;

        for (let i = 0; i < maxFiles + 100; i++) {
            const filePath = path.join(testDir, `file-${i}.txt`);
            await fs.writeFile(filePath, `content ${i}`);
            await tracker.read(filePath);
        }

        const trackedCount = tracker.getTrackedFileCount();
        expect(trackedCount).toBeLessThanOrEqual(maxFiles);
    });

    it("should remove oldest files when limit is reached", async () => {
        const filesToCreate = 1050;
        const filePaths: string[] = [];

        for (let i = 0; i < filesToCreate; i++) {
            const filePath = path.join(testDir, `file-${i}.txt`);
            await fs.writeFile(filePath, `content ${i}`);
            filePaths.push(filePath);
            await tracker.read(filePath);
        }

        const trackedFiles = tracker.getTrackedFiles();
        expect(trackedFiles.length).toBeLessThanOrEqual(1000);

        const firstFile = path.resolve(filePaths[0]);
        expect(trackedFiles.includes(firstFile)).toBe(false);
    });

    it("should still track recent files correctly", async () => {
        for (let i = 0; i < 1100; i++) {
            const filePath = path.join(testDir, `file-${i}.txt`);
            await fs.writeFile(filePath, `content ${i}`);
            await tracker.read(filePath);
        }

        const lastFile = path.join(testDir, "file-1099.txt");
        const trackedFiles = tracker.getTrackedFiles();
        expect(trackedFiles.includes(path.resolve(lastFile))).toBe(true);
    });

    it("should handle write operations with limit", async () => {
        for (let i = 0; i < 1100; i++) {
            const filePath = path.join(testDir, `file-${i}.txt`);
            await tracker.write(filePath, `content ${i}`);
        }

        const trackedCount = tracker.getTrackedFileCount();
        expect(trackedCount).toBeLessThanOrEqual(1000);
    });
});
