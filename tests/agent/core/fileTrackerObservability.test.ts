import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileTracker } from "../../../src/agent/core/fileTracker.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

describe("FileTracker Observability", () => {
    let tracker: FileTracker;
    let testDir: string;

    beforeEach(async () => {
        tracker = new FileTracker();
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), "filetracker-test-"));
    });

    afterEach(async () => {
        tracker.clearTracking();
        await fs.rm(testDir, { recursive: true, force: true });
    });

    it("should track files after reading", async () => {
        const filePath = path.join(testDir, "test.txt");
        await fs.writeFile(filePath, "content");

        expect(tracker.getTrackedFileCount()).toBe(0);
        expect(tracker.isTracked(filePath)).toBe(false);

        await tracker.read(filePath);

        expect(tracker.getTrackedFileCount()).toBe(1);
        expect(tracker.isTracked(filePath)).toBe(true);
        expect(tracker.getTrackedFiles()).toContain(path.resolve(filePath));
    });

    it("should track files after writing", async () => {
        const filePath = path.join(testDir, "new.txt");

        expect(tracker.isTracked(filePath)).toBe(false);

        await tracker.write(filePath, "content");

        expect(tracker.isTracked(filePath)).toBe(true);
        expect(tracker.getTrackedFileCount()).toBe(1);
    });

    it("should return list of tracked files", async () => {
        const file1 = path.join(testDir, "file1.txt");
        const file2 = path.join(testDir, "file2.txt");

        await tracker.write(file1, "content1");
        await tracker.write(file2, "content2");

        const tracked = tracker.getTrackedFiles();
        expect(tracked).toHaveLength(2);
        expect(tracked).toContain(path.resolve(file1));
        expect(tracked).toContain(path.resolve(file2));
    });

    it("should clear all tracking", async () => {
        const file1 = path.join(testDir, "file1.txt");
        const file2 = path.join(testDir, "file2.txt");

        await tracker.write(file1, "content1");
        await tracker.write(file2, "content2");

        expect(tracker.getTrackedFileCount()).toBe(2);

        tracker.clearTracking();

        expect(tracker.getTrackedFileCount()).toBe(0);
        expect(tracker.getTrackedFiles()).toHaveLength(0);
        expect(tracker.isTracked(file1)).toBe(false);
    });

    it("should use absolute paths for tracking", async () => {
        const relativePath = "test.txt";
        const absolutePath = path.resolve(testDir, relativePath);
        await fs.writeFile(absolutePath, "content");

        const originalCwd = process.cwd();
        try {
            process.chdir(testDir);
            await tracker.read(relativePath);

            expect(tracker.isTracked(absolutePath)).toBe(true);
            expect(tracker.getTrackedFiles()[0]).toBe(absolutePath);
        } finally {
            process.chdir(originalCwd);
        }
    });

    it("should update tracked files on re-read", async () => {
        const filePath = path.join(testDir, "test.txt");
        await fs.writeFile(filePath, "content1");

        await tracker.read(filePath);
        const firstTracked = tracker.getTrackedFiles();

        await fs.writeFile(filePath, "content2");
        await new Promise((resolve) => setTimeout(resolve, 10));

        await tracker.read(filePath);
        const secondTracked = tracker.getTrackedFiles();

        expect(firstTracked).toHaveLength(1);
        expect(secondTracked).toHaveLength(1);
        expect(tracker.getTrackedFileCount()).toBe(1);
    });
});
