import { describe, expect, it, vi, beforeEach } from "vitest";
import editTool from "../../../../src/agent/tools/definitions/edit";
import { fileTracker } from "../../../../src/agent/fileTracker";
import { autofixEdit } from "../../../../src/agent/autofix";
import { ToolError } from "../../../../src/agent/errors";

vi.mock("../../../../src/agent/fileTracker");
vi.mock("../../../../src/agent/autofix");

describe("edit tool", () => {
    const mockRead = vi.mocked(fileTracker.read);
    const mockWrite = vi.mocked(fileTracker.write);
    const mockAssertCanEdit = vi.mocked(fileTracker.assertCanEdit);
    const mockAutofixEdit = vi.mocked(autofixEdit);

    beforeEach(() => {
        vi.resetAllMocks();
        // Setup default mock implementations
        mockAssertCanEdit.mockResolvedValue(undefined);
        mockWrite.mockResolvedValue(undefined);
    });

    describe("replace action", () => {
        it("should replace content when search string is found", async () => {
            mockRead.mockResolvedValue("hello world");
            const { implementation } = editTool;

            const result = await implementation({
                path: "test.txt",
                edit: {
                    type: "replace",
                    search: "world",
                    replaceWith: "friend",
                },
            });

            expect(result).toBe("Successfully edited file at test.txt");
            expect(mockWrite).toHaveBeenCalledWith("test.txt", "hello friend");
            expect(mockAutofixEdit).not.toHaveBeenCalled();
        });

        it("should use autofix when search string is not found", async () => {
            mockRead.mockResolvedValue("hello world");
            mockAutofixEdit.mockResolvedValue("world"); // Autofix finds the correct string
            const { implementation } = editTool;

            await implementation({
                path: "test.txt",
                edit: {
                    type: "replace",
                    search: "wrold", // Typo
                    replaceWith: "friend",
                },
            });

            expect(mockWrite).toHaveBeenCalledWith("test.txt", "hello friend");
            expect(mockAutofixEdit).toHaveBeenCalledWith("hello world", "wrold");
        });

        it("should throw an error when search string is not found and autofix fails", async () => {
            mockRead.mockResolvedValue("hello world");
            mockAutofixEdit.mockResolvedValue(null); // Autofix fails
            const { implementation } = editTool;

            await expect(
                implementation({
                    path: "test.txt",
                    edit: {
                        type: "replace",
                        search: "nonexistent",
                        replaceWith: "friend",
                    },
                }),
            ).rejects.toThrow("The search string was not found in the file and autofix failed.");
        });
    });

    describe("insert action", () => {
        it("should insert content at the specified line number", async () => {
            mockRead.mockResolvedValue("line 1\nline 3");
            const { implementation } = editTool;

            await implementation({
                path: "test.txt",
                edit: {
                    type: "insert",
                    lineNumber: 2,
                    content: "line 2",
                },
            });

            expect(mockWrite).toHaveBeenCalledWith("test.txt", "line 1\nline 2\nline 3");
        });

        it("should throw an error for invalid line numbers", async () => {
            mockRead.mockResolvedValue("line 1");
            const { implementation } = editTool;

            await expect(
                implementation({
                    path: "test.txt",
                    edit: {
                        type: "insert",
                        lineNumber: 3,
                        content: "line 3",
                    },
                }),
            ).rejects.toThrow("Invalid line number 3. File has 1 lines. Must be between 1 and 2.");

            await expect(
                implementation({
                    path: "test.txt",
                    edit: {
                        type: "insert",
                        lineNumber: 0,
                        content: "line 0",
                    },
                }),
            ).rejects.toThrow("Invalid line number 0. File has 1 lines. Must be between 1 and 2.");
        });
    });

    describe("delete action", () => {
        it("should delete the specified content", async () => {
            mockRead.mockResolvedValue("hello world");
            const { implementation } = editTool;

            await implementation({
                path: "test.txt",
                edit: {
                    type: "delete",
                    content: " world",
                },
            });

            expect(mockWrite).toHaveBeenCalledWith("test.txt", "hello");
        });

        it("should throw an error if content to delete is not found", async () => {
            mockRead.mockResolvedValue("hello world");
            const { implementation } = editTool;

            await expect(
                implementation({
                    path: "test.txt",
                    edit: {
                        type: "delete",
                        content: "nonexistent",
                    },
                }),
            ).rejects.toThrow("The content to delete was not found in the file.");
        });
    });

    describe("append action", () => {
        it("should append content to the end of the file", async () => {
            mockRead.mockResolvedValue("hello");
            const { implementation } = editTool;

            await implementation({
                path: "test.txt",
                edit: {
                    type: "append",
                    content: " world",
                },
            });

            expect(mockWrite).toHaveBeenCalledWith("test.txt", "hello world");
        });
    });

    describe("prepend action", () => {
        it("should prepend content to the beginning of the file", async () => {
            mockRead.mockResolvedValue("world");
            const { implementation } = editTool;

            await implementation({
                path: "test.txt",
                edit: {
                    type: "prepend",
                    content: "hello ",
                },
            });

            expect(mockWrite).toHaveBeenCalledWith("test.txt", "hello world");
        });
    });

    describe("overwrite action", () => {
        it("should overwrite the entire file", async () => {
            mockRead.mockResolvedValue("old content");
            const { implementation } = editTool;

            await implementation({
                path: "test.txt",
                edit: {
                    type: "overwrite",
                    content: "new content",
                },
            });

            expect(mockWrite).toHaveBeenCalledWith("test.txt", "new content");
        });
    });

    describe("general error handling", () => {
        it("should throw a ToolError if the file is not found", async () => {
            const error: NodeJS.ErrnoException = new Error("File not found");
            error.code = "ENOENT";
            mockRead.mockRejectedValue(error);
            const { implementation } = editTool;

            await expect(
                implementation({
                    path: "nonexistent.txt",
                    edit: {
                        type: "append",
                        content: "test",
                    },
                }),
            ).rejects.toThrow("File not found at nonexistent.txt. Use the 'create' tool first.");
        });

        it("should re-throw known ToolErrors", async () => {
            mockRead.mockRejectedValue(new ToolError("A known tool error"));
            const { implementation } = editTool;

            await expect(
                implementation({
                    path: "test.txt",
                    edit: {
                        type: "append",
                        content: "test",
                    },
                }),
            ).rejects.toThrow("A known tool error");
        });

        it("should wrap other errors in a ToolError", async () => {
            mockRead.mockRejectedValue(new Error("Some other error"));
            const { implementation } = editTool;

            await expect(
                implementation({
                    path: "test.txt",
                    edit: {
                        type: "append",
                        content: "test",
                    },
                }),
            ).rejects.toThrow("Some other error");
        });

        it("should handle unknown non-error throws", async () => {
            mockRead.mockRejectedValue("an unknown error string");
            const { implementation } = editTool;

            await expect(
                implementation({
                    path: "test.txt",
                    edit: {
                        type: "append",
                        content: "test",
                    },
                }),
            ).rejects.toThrow("An unknown error occurred while editing the file.");
        });
    });
});
