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

        const { implementation } = readFileTool;
        const result = await implementation({ path: "test.ts" });

        expect(result).toBe("file content");
        expect(mockRead).toHaveBeenCalledWith("test.ts");
    });

    it("should throw a ToolError when the file is not found", async () => {
        const mockRead = vi.mocked(fileTracker.read);
        const error: NodeJS.ErrnoException = new Error("File not found");
        error.code = "ENOENT";
        mockRead.mockRejectedValue(error);

        const { implementation } = readFileTool;
        await expect(implementation({ path: "nonexistent.ts" })).rejects.toThrow(
            "File not found at path: nonexistent.ts",
        );
    });

    it("should throw a ToolError for other read errors", async () => {
        const mockRead = vi.mocked(fileTracker.read);
        mockRead.mockRejectedValue(new Error("Some other error"));

        const { implementation } = readFileTool;
        await expect(implementation({ path: "test.ts" })).rejects.toThrow(
            "Error reading file: Some other error",
        );
    });

    it("should throw a ToolError for unknown errors", async () => {
        const mockRead = vi.mocked(fileTracker.read);
        mockRead.mockRejectedValue("an unknown error");

        const { implementation } = readFileTool;
        await expect(implementation({ path: "test.ts" })).rejects.toThrow(
            "An unknown error occurred while reading the file.",
        );
    });
});
