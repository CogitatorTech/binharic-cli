import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
    FileExistsError,
    FileOutdatedError,
    FileTracker,
} from "../../src/agent/core/fileTracker.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

describe("FileTracker", () => {
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

    it("should track file reads", async () => {
        const filePath = path.join(testDir, "test.txt");
        await fs.writeFile(filePath, "test content");

        await tracker.read(filePath);
        const tracked = tracker.getTrackedFiles();

        expect(tracked).toContain(path.resolve(filePath));
    });

    it("should track file writes", async () => {
        const filePath = path.join(testDir, "test.txt");

        await tracker.write(filePath, "test content");
        const tracked = tracker.getTrackedFiles();

        expect(tracked).toContain(path.resolve(filePath));
    });

    it("should throw FileExistsError when creating existing file", async () => {
        const filePath = path.join(testDir, "existing.txt");
        await fs.writeFile(filePath, "content");

        await expect(tracker.assertCanCreate(filePath)).rejects.toThrow(FileExistsError);
    });

    it("should not throw when creating non-existing file", async () => {
        const filePath = path.join(testDir, "new.txt");

        await expect(tracker.assertCanCreate(filePath)).resolves.not.toThrow();
    });

    it("should throw FileOutdatedError when file modified after read", async () => {
        const filePath = path.join(testDir, "test.txt");
        await fs.writeFile(filePath, "content");

        await tracker.read(filePath);
        await new Promise((resolve) => setTimeout(resolve, 10));
        await fs.writeFile(filePath, "modified content");

        await expect(tracker.assertCanEdit(filePath)).rejects.toThrow(FileOutdatedError);
    });

    it("should clear all tracking", async () => {
        const filePath = path.join(testDir, "test.txt");
        await fs.writeFile(filePath, "content");

        await tracker.read(filePath);
        expect(tracker.getTrackedFiles()).toHaveLength(1);

        tracker.clearTracking();
        expect(tracker.getTrackedFiles()).toHaveLength(0);
    });

    it("should return empty array when no files tracked", () => {
        expect(tracker.getTrackedFiles()).toEqual([]);
    });

    it("should handle absolute paths correctly", async () => {
        const filePath = path.join(testDir, "test.txt");
        await fs.writeFile(filePath, "content");

        await tracker.read(filePath);
        const tracked = tracker.getTrackedFiles();

        expect(tracked[0]).toBe(path.resolve(filePath));
    });

    it("should automatically track unread files when attempting to edit", async () => {
        const filePath = path.join(testDir, "unread.txt");
        await fs.writeFile(filePath, "content");

        // Should not throw - file will be automatically tracked
        await expect(tracker.assertCanEdit(filePath)).resolves.not.toThrow();

        // Verify the file is now tracked
        expect(tracker.getTrackedFileCount()).toBeGreaterThan(0);
    });
});
