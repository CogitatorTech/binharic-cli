import { describe, expect, it, vi } from "vitest";
import listTool from "../../../../src/agent/tools/definitions/list";
import fs from "fs/promises";

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

        mockStat.mockResolvedValue({ isDirectory: () => true } as fs.Stats);
        mockReaddir.mockResolvedValue(["file1.ts", "file2.ts"]);

        const { implementation } = listTool;
        const result = await implementation({ path: "/test" });

        expect(result).toBe("file1.ts\nfile2.ts");
        expect(mockStat).toHaveBeenCalledWith("/test");
        expect(mockReaddir).toHaveBeenCalledWith("/test");
    });

    it("should return a message when the directory is empty", async () => {
        const mockStat = vi.mocked(fs.stat);
        const mockReaddir = vi.mocked(fs.readdir);

        mockStat.mockResolvedValue({ isDirectory: () => true } as fs.Stats);
        mockReaddir.mockResolvedValue([]);

        const { implementation } = listTool;
        const result = await implementation({ path: "/test" });

        expect(result).toBe("Directory is empty.");
    });

    it("should throw a ToolError when the path is not a directory", async () => {
        const mockStat = vi.mocked(fs.stat);
        mockStat.mockResolvedValue({ isDirectory: () => false } as fs.Stats);

        const { implementation } = listTool;
        await expect(implementation({ path: "/test" })).rejects.toThrow(
            "'/test' is not a directory.",
        );
    });

    it("should throw a ToolError when the path does not exist", async () => {
        const mockStat = vi.mocked(fs.stat);
        const error: NodeJS.ErrnoException = new Error("Not found");
        error.code = "ENOENT";
        mockStat.mockRejectedValue(error);

        const { implementation } = listTool;
        await expect(implementation({ path: "/nonexistent" })).rejects.toThrow(
            "Directory not found at path: /nonexistent",
        );
    });

    it("should throw a ToolError for other stat errors", async () => {
        const mockStat = vi.mocked(fs.stat);
        mockStat.mockRejectedValue(new Error("Some other error"));

        const { implementation } = listTool;
        await expect(implementation({ path: "/test" })).rejects.toThrow(
            "Error listing files: Some other error",
        );
    });

    it("should list the current directory when no path is provided", async () => {
        const mockStat = vi.mocked(fs.stat);
        const mockReaddir = vi.mocked(fs.readdir);
        const cwd = process.cwd();

        mockStat.mockResolvedValue({ isDirectory: () => true } as fs.Stats);
        mockReaddir.mockResolvedValue(["file1.ts", "file2.ts"]);

        const { implementation } = listTool;
        const result = await implementation({});

        expect(result).toBe("file1.ts\nfile2.ts");
        expect(mockStat).toHaveBeenCalledWith(cwd);
        expect(mockReaddir).toHaveBeenCalledWith(cwd);
    });

    it("should throw a ToolError for unknown errors", async () => {
        const mockStat = vi.mocked(fs.stat);
        mockStat.mockRejectedValue("an unknown error");

        const { implementation } = listTool;
        await expect(implementation({ path: "/test" })).rejects.toThrow(
            "An unknown error occurred while listing files.",
        );
    });
});
