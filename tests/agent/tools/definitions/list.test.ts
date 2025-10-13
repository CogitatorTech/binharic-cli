import { describe, expect, it, vi, beforeEach } from "vitest";
import listTool from "../../../../src/agent/tools/definitions/list";
import fs from "fs/promises";

vi.mock("fs/promises");

describe("list tool", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it("should return a list of files when the path is a directory", async () => {
        vi.mocked(fs.stat).mockResolvedValue({
            isDirectory: () => true,
        } as any);
        vi.mocked(fs.readdir).mockResolvedValue(["file1.ts", "file2.ts"] as any);

        const result = await listTool.execute!({ path: "/test" }, {} as any);

        expect(result).toBe("file1.ts\nfile2.ts");
    });

    it("should return a message when the directory is empty", async () => {
        vi.mocked(fs.stat).mockResolvedValue({
            isDirectory: () => true,
        } as any);
        vi.mocked(fs.readdir).mockResolvedValue([] as any);

        const result = await listTool.execute!({ path: "/test" }, {} as any);

        expect(result).toBe("Directory is empty.");
    });

    it("should throw a ToolError when the path is not a directory", async () => {
        vi.mocked(fs.stat).mockResolvedValue({
            isDirectory: () => false,
        } as any);

        await expect(listTool.execute!({ path: "/test" }, {} as any)).rejects.toThrow(
            "'/test' is not a directory.",
        );
    });

    it("should throw a ToolError when the path does not exist", async () => {
        const error: NodeJS.ErrnoException = new Error("ENOENT");
        error.code = "ENOENT";
        vi.mocked(fs.stat).mockRejectedValue(error);

        await expect(listTool.execute!({ path: "/test" }, {} as any)).rejects.toThrow(
            "Directory not found at path: /test",
        );
    });

    it("should throw a generic ToolError for other errors", async () => {
        vi.mocked(fs.stat).mockRejectedValue(new Error("Permission denied"));

        await expect(listTool.execute!({ path: "/test" }, {} as any)).rejects.toThrow(
            "Error listing files: Permission denied",
        );
    });

    it("should handle special characters in filenames", async () => {
        vi.mocked(fs.stat).mockResolvedValue({
            isDirectory: () => true,
        } as any);
        vi.mocked(fs.readdir).mockResolvedValue([
            "file with spaces.ts",
            "file@special#chars.ts",
        ] as any);

        const result = await listTool.execute!({ path: "/test" }, {} as any);

        expect(result).toBe("file with spaces.ts\nfile@special#chars.ts");
    });
});
