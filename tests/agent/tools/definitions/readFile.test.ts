import { describe, expect, it, vi } from "vitest";
import readFileTool from "../../../../src/agent/tools/definitions/readFile";
import { fileTracker } from "../../../../src/agent/fileTracker";

vi.mock("../../../../src/agent/fileTracker", () => ({
    fileTracker: {
        read: vi.fn(),
    },
}));

describe("readFile tool", () => {
    it("should return the file content when read is successful", async () => {
        const mockRead = vi.mocked(fileTracker.read);
        mockRead.mockResolvedValue("file content");

        const result = await readFileTool.execute!({ path: "test.ts" }, {} as any);

        expect(result).toBe("file content");
        expect(mockRead).toHaveBeenCalledWith("test.ts");
    });

    it("should throw a ToolError when the file is not found", async () => {
        const mockRead = vi.mocked(fileTracker.read);
        const error: NodeJS.ErrnoException = new Error("File not found");
        error.code = "ENOENT";
        mockRead.mockRejectedValue(error);

        await expect(readFileTool.execute!({ path: "nonexistent.ts" }, {} as any)).rejects.toThrow(
            "File not found at path: nonexistent.ts",
        );
    });

    it("should throw a ToolError for other read errors", async () => {
        const mockRead = vi.mocked(fileTracker.read);
        mockRead.mockRejectedValue(new Error("Some other error"));

        await expect(readFileTool.execute!({ path: "test.ts" }, {} as any)).rejects.toThrow(
            "Error reading file: Some other error",
        );
    });

    it("should throw a ToolError for unknown errors", async () => {
        const mockRead = vi.mocked(fileTracker.read);
        mockRead.mockRejectedValue("an unknown error");

        await expect(readFileTool.execute!({ path: "test.ts" }, {} as any)).rejects.toThrow(
            "An unknown error occurred while reading the file.",
        );
    });
});
