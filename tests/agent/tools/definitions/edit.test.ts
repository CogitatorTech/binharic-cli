import { beforeEach, describe, expect, it, vi } from "vitest";
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
        mockAssertCanEdit.mockResolvedValue(undefined);
        mockWrite.mockResolvedValue(undefined);
    });

    describe("replace action", () => {
        it("should replace content when search string is found", async () => {
            mockRead.mockResolvedValue("hello world");

            const result = await editTool.execute!(
                {
                    path: "test.txt",
                    edit: {
                        type: "replace",
                        search: "world",
                        replaceWith: "friend",
                    },
                },
                {} as any,
            );

            expect(result).toBe("Successfully edited file at test.txt");
            expect(mockWrite).toHaveBeenCalledWith("test.txt", "hello friend");
            expect(mockAutofixEdit).not.toHaveBeenCalled();
        });

        it("should use autofix when search string is not found", async () => {
            mockRead.mockResolvedValue("hello world");
            mockAutofixEdit.mockResolvedValue("world");

            await editTool.execute!(
                {
                    path: "test.txt",
                    edit: {
                        type: "replace",
                        search: "wrold",
                        replaceWith: "friend",
                    },
                },
                {} as any,
            );

            expect(mockAutofixEdit).toHaveBeenCalled();
            expect(mockWrite).toHaveBeenCalledWith("test.txt", "hello friend");
        });

        it("should throw an error when search string is not found and autofix fails", async () => {
            mockRead.mockResolvedValue("hello world");
            mockAutofixEdit.mockRejectedValue(new Error("Autofix failed"));

            await expect(
                editTool.execute!(
                    {
                        path: "test.txt",
                        edit: {
                            type: "replace",
                            search: "xyz",
                            replaceWith: "abc",
                        },
                    },
                    {} as any,
                ),
            ).rejects.toThrow();
        });
    });

    describe("insert action", () => {
        it("should insert content at the specified line number", async () => {
            mockRead.mockResolvedValue("line1\nline2\nline3");

            await editTool.execute!(
                {
                    path: "test.txt",
                    edit: {
                        type: "insert",
                        line: 2,
                        content: "inserted line",
                    },
                },
                {} as any,
            );

            expect(mockWrite).toHaveBeenCalledWith(
                "test.txt",
                "line1\ninserted line\nline2\nline3",
            );
        });

        it("should throw an error for invalid line numbers", async () => {
            mockRead.mockResolvedValue("line1\nline2");

            await expect(
                editTool.execute!(
                    {
                        path: "test.txt",
                        edit: {
                            type: "insert",
                            line: 100,
                            content: "new line",
                        },
                    },
                    {} as any,
                ),
            ).rejects.toThrow();
        });
    });

    describe("delete action", () => {
        it("should delete the specified content", async () => {
            mockRead.mockResolvedValue("line1\nline2\nline3");

            await editTool.execute!(
                {
                    path: "test.txt",
                    edit: {
                        type: "delete",
                        content: "line2\n",
                    },
                },
                {} as any,
            );

            expect(mockWrite).toHaveBeenCalledWith("test.txt", "line1\nline3");
        });

        it("should throw an error if content to delete is not found", async () => {
            mockRead.mockResolvedValue("line1\nline2");

            await expect(
                editTool.execute!(
                    {
                        path: "test.txt",
                        edit: {
                            type: "delete",
                            content: "nonexistent",
                        },
                    },
                    {} as any,
                ),
            ).rejects.toThrow();
        });
    });

    describe("append action", () => {
        it("should append content to the end of the file", async () => {
            mockRead.mockResolvedValue("existing content");

            await editTool.execute!(
                {
                    path: "test.txt",
                    edit: {
                        type: "append",
                        content: "\nnew line",
                    },
                },
                {} as any,
            );

            expect(mockWrite).toHaveBeenCalledWith("test.txt", "existing content\nnew line");
        });
    });

    describe("prepend action", () => {
        it("should prepend content to the beginning of the file", async () => {
            mockRead.mockResolvedValue("existing content");

            await editTool.execute!(
                {
                    path: "test.txt",
                    edit: {
                        type: "prepend",
                        content: "new line\n",
                    },
                },
                {} as any,
            );

            expect(mockWrite).toHaveBeenCalledWith("test.txt", "new line\nexisting content");
        });
    });

    describe("overwrite action", () => {
        it("should overwrite the entire file", async () => {
            mockRead.mockResolvedValue("old content");

            await editTool.execute!(
                {
                    path: "test.txt",
                    edit: {
                        type: "overwrite",
                        content: "new content",
                    },
                },
                {} as any,
            );

            expect(mockWrite).toHaveBeenCalledWith("test.txt", "new content");
        });
    });

    describe("general error handling", () => {
        it("should throw a ToolError if the file is not found", async () => {
            const error: NodeJS.ErrnoException = new Error("File not found");
            error.code = "ENOENT";
            mockRead.mockRejectedValue(error);

            await expect(
                editTool.execute!(
                    {
                        path: "nonexistent.txt",
                        edit: {
                            type: "append",
                            content: "test",
                        },
                    },
                    {} as any,
                ),
            ).rejects.toThrow(ToolError);
        });

        it("should re-throw known ToolErrors", async () => {
            mockRead.mockRejectedValue(new ToolError("Known error"));

            await expect(
                editTool.execute!(
                    {
                        path: "test.txt",
                        edit: {
                            type: "append",
                            content: "test",
                        },
                    },
                    {} as any,
                ),
            ).rejects.toThrow(ToolError);
        });

        it("should wrap other errors in a ToolError", async () => {
            mockRead.mockRejectedValue(new Error("Some error"));

            await expect(
                editTool.execute!(
                    {
                        path: "test.txt",
                        edit: {
                            type: "append",
                            content: "test",
                        },
                    },
                    {} as any,
                ),
            ).rejects.toThrow(ToolError);
        });

        it("should handle unknown non-error throws", async () => {
            mockRead.mockRejectedValue("string error");

            await expect(
                editTool.execute!(
                    {
                        path: "test.txt",
                        edit: {
                            type: "append",
                            content: "test",
                        },
                    },
                    {} as any,
                ),
            ).rejects.toThrow(ToolError);
        });
    });
});
