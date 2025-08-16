import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileExistsError, FileOutdatedError, FileTracker } from "@/agent/fileTracker";
import fs from "fs/promises";
import { Stats } from "fs";
import path from "path";

// Mock the fs/promises module
vi.mock("fs/promises");

describe("FileTracker", () => {
    let fileTracker: FileTracker;

    beforeEach(() => {
        // Create a new instance before each test
        fileTracker = new FileTracker();
        // Reset mocks before each test
        vi.resetAllMocks();
    });

    it("should be defined", () => {
        expect(fileTracker).toBeDefined();
    });

    describe("read", () => {
        it("should read a file and track its modification time", async () => {
            const filePath = "test.txt";
            const content = "hello world";
            const mtimeMs = Date.now();
            const absolutePath = path.resolve(filePath);

            vi.mocked(fs.readFile).mockResolvedValue(content);
            vi.mocked(fs.stat).mockResolvedValue({ mtimeMs } as Stats);

            const result = await fileTracker.read(filePath);

            expect(result).toBe(content);
            expect(fs.readFile).toHaveBeenCalledWith(absolutePath, "utf8");
            expect(fs.stat).toHaveBeenCalledWith(absolutePath);
            // Check that the timestamp is stored
            // @ts-expect-error - private property access
            expect(fileTracker.readTimestamps.get(absolutePath)).toBe(mtimeMs);
        });

        it("should throw an error if the file does not exist", async () => {
            const filePath = "non-existent-file.txt";
            const error = new Error("ENOENT");
            vi.mocked(fs.readFile).mockRejectedValue(error);

            await expect(fileTracker.read(filePath)).rejects.toThrow(error);
        });
    });

    describe("write", () => {
        it("should write to a file and track its modification time", async () => {
            const filePath = "test.txt";
            const content = "hello world";
            const mtimeMs = Date.now();
            const absolutePath = path.resolve(filePath);
            const dir = path.dirname(absolutePath);

            vi.mocked(fs.writeFile).mockResolvedValue(undefined);
            vi.mocked(fs.stat).mockResolvedValue({ mtimeMs } as Stats);
            vi.mocked(fs.mkdir).mockResolvedValue(undefined);

            await fileTracker.write(filePath, content);

            expect(fs.mkdir).toHaveBeenCalledWith(dir, { recursive: true });
            expect(fs.writeFile).toHaveBeenCalledWith(absolutePath, content, "utf8");
            expect(fs.stat).toHaveBeenCalledWith(absolutePath);
            // Check that the timestamp is stored
            // @ts-expect-error - private property access
            expect(fileTracker.readTimestamps.get(absolutePath)).toBe(mtimeMs);
        });

        it("should throw an error if directory creation fails", async () => {
            const filePath = "test.txt";
            const content = "hello world";
            const error = new Error("EACCES");
            vi.mocked(fs.mkdir).mockRejectedValue(error);

            await expect(fileTracker.write(filePath, content)).rejects.toThrow(error);
        });
    });

    describe("assertCanCreate", () => {
        it("should throw FileExistsError if file exists", async () => {
            const filePath = "test.txt";

            // Simulate file existing
            vi.mocked(fs.access).mockResolvedValue(undefined);

            await expect(fileTracker.assertCanCreate(filePath)).rejects.toThrow(FileExistsError);
        });

        it("should not throw if file does not exist", async () => {
            const filePath = "test.txt";

            // Simulate file not existing
            const error = new Error("ENOENT: no such file or directory");
            (error as NodeJS.ErrnoException).code = "ENOENT";
            vi.mocked(fs.access).mockRejectedValue(error);

            await expect(fileTracker.assertCanCreate(filePath)).resolves.toBeUndefined();
        });

        it("should re-throw other fs.access errors", async () => {
            const filePath = "test.txt";
            const error = new Error("EACCES");
            vi.mocked(fs.access).mockRejectedValue(error);

            await expect(fileTracker.assertCanCreate(filePath)).rejects.toThrow(error);
        });
    });

    describe("assertCanEdit", () => {
        const filePath = "test.txt";
        const absolutePath = path.resolve(filePath);

        it("should throw FileOutdatedError if file has not been read", async () => {
            await expect(fileTracker.assertCanEdit(filePath)).rejects.toThrow(FileOutdatedError);
        });

        it("should not throw if file is read and not modified", async () => {
            const mtimeMs = Date.now();
            vi.mocked(fs.stat).mockResolvedValue({ mtimeMs } as Stats);

            // @ts-expect-error - private property access
            fileTracker.readTimestamps.set(absolutePath, mtimeMs);

            await expect(fileTracker.assertCanEdit(filePath)).resolves.toBeUndefined();
        });

        it("should throw FileOutdatedError if file was modified after read", async () => {
            const initialTime = Date.now();
            const modifiedTime = initialTime + 1000;
            vi.mocked(fs.stat).mockResolvedValue({ mtimeMs: modifiedTime } as Stats);

            // @ts-expect-error - private property access
            fileTracker.readTimestamps.set(absolutePath, initialTime);

            await expect(fileTracker.assertCanEdit(filePath)).rejects.toThrow(FileOutdatedError);
        });

        it("should throw FileOutdatedError if file was deleted after read", async () => {
            const initialTime = Date.now();
            const error = new Error("ENOENT: no such file or directory");
            (error as NodeJS.ErrnoException).code = "ENOENT";
            vi.mocked(fs.stat).mockRejectedValue(error);

            // @ts-expect-error - private property access
            fileTracker.readTimestamps.set(absolutePath, initialTime);

            await expect(fileTracker.assertCanEdit(filePath)).rejects.toThrow(FileOutdatedError);
        });

        it("should throw any other fs.stat error", async () => {
            const initialTime = Date.now();
            const error = new Error("EACCES");
            vi.mocked(fs.stat).mockRejectedValue(error);

            // @ts-expect-error - private property access
            fileTracker.readTimestamps.set(absolutePath, initialTime);

            await expect(fileTracker.assertCanEdit(filePath)).rejects.toThrow(error);
        });
    });
});
