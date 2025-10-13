import { describe, expect, it, vi } from "vitest";
import listTool from "../../../../src/agent/tools/definitions/list";
import fs from "fs/promises";
import { Stats, Dirent } from "fs";

vi.mock("fs/promises", () => ({
    default: {
        stat: vi.fn(),
        readdir: vi.fn(),
    },
}));

describe("list tool", () => {
    it("should return a list of files when the path is a directory", async () => {
        const mockStat = vi.mocked(fs.stat);
        const mockReaddir = vi.mocked(fs.readdir);

        mockStat.mockResolvedValue({ isDirectory: () => true } as Stats);
        mockReaddir.mockResolvedValue(["file1.ts", "file2.ts"] as unknown as Dirent[]);

        const { implementation } = listTool;
        const result = await implementation({ path: "/test" });

        expect(result).toBe("file1.ts\nfile2.ts");
        expect(mockStat).toHaveBeenCalledWith("/test");
        expect(mockReaddir).toHaveBeenCalledWith("/test");
    });

    it("should return a message when the directory is empty", async () => {
        const mockStat = vi.mocked(fs.stat);
        const mockReaddir = vi.mocked(fs.readdir);

        mockStat.mockResolvedValue({ isDirectory: () => true } as Stats);
        mockReaddir.mockResolvedValue([]);

        const { implementation } = listTool;
        const result = await implementation({ path: "/test" });

        expect(result).toBe("Directory is empty.");
    });

    it("should throw a ToolError when the path is not a directory", async () => {
        const mockStat = vi.mocked(fs.stat);
        mockStat.mockResolvedValue({ isDirectory: () => false } as Stats);

        const { implementation } = listTool;
        await expect(implementation({ path: "/test" })).rejects.toThrow(
            "'/test' is not a directory.",
        );
    });

    it("should throw a ToolError when the path does not exist", async () => {
        const mockStat = vi.mocked(fs.stat);
        const error = new Error("ENOENT: no such file or directory") as NodeJS.ErrnoException;
        error.code = "ENOENT";
        mockStat.mockRejectedValue(error);

        const { implementation } = listTool;
        await expect(implementation({ path: "/test" })).rejects.toThrow(
            "Directory not found at path: /test",
        );
    });

    it("should throw a generic ToolError for other errors", async () => {
        const mockStat = vi.mocked(fs.stat);
        mockStat.mockRejectedValue(new Error("Permission denied"));

        const { implementation } = listTool;
        await expect(implementation({ path: "/test" })).rejects.toThrow("Permission denied");
    });

    it("should handle special characters in filenames", async () => {
        const mockStat = vi.mocked(fs.stat);
        const mockReaddir = vi.mocked(fs.readdir);

        mockStat.mockResolvedValue({ isDirectory: () => true } as Stats);
        mockReaddir.mockResolvedValue([
            "file with spaces.ts",
            "file@special#chars.ts",
        ] as unknown as Dirent[]);

        const { implementation } = listTool;
        const result = await implementation({ path: "/test" });

        expect(result).toBe("file with spaces.ts\nfile@special#chars.ts");
    });
});
