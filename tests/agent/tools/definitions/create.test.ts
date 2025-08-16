import { beforeEach, describe, expect, it, vi } from "vitest";
import create from "../../../../src/agent/tools/definitions/create";
import { fileTracker } from "../../../../src/agent/fileTracker";
import { FileExistsError } from "../../../../src/agent/errors";

vi.mock("../../../../src/agent/fileTracker", () => ({
    fileTracker: {
        assertCanCreate: vi.fn(),
        write: vi.fn(),
    },
}));

describe("create tool", () => {
    const mockArgs = {
        path: "test.txt",
        content: "Hello, World!",
    };

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it("should return a success message on successful creation", async () => {
        vi.mocked(fileTracker.assertCanCreate).mockResolvedValue(undefined);
        vi.mocked(fileTracker.write).mockResolvedValue(undefined);

        const result = await create.implementation(mockArgs);

        expect(result).toBe("Successfully created file at test.txt");
        expect(fileTracker.assertCanCreate).toHaveBeenCalledWith("test.txt");
        expect(fileTracker.write).toHaveBeenCalledWith("test.txt", "Hello, World!");
    });

    it("should throw a ToolError if the file already exists", async () => {
        const error = new FileExistsError(
            "File already exists at test.txt. Use the 'edit' tool to modify it.",
        );
        vi.mocked(fileTracker.assertCanCreate).mockRejectedValue(error);

        await expect(create.implementation(mockArgs)).rejects.toThrow(
            "File already exists at test.txt. Use the 'edit' tool to modify it.",
        );

        expect(fileTracker.write).not.toHaveBeenCalled();
    });

    it("should throw a ToolError for other errors", async () => {
        const error = new Error("Something went wrong");
        vi.mocked(fileTracker.assertCanCreate).mockRejectedValue(error);

        await expect(create.implementation(mockArgs)).rejects.toThrow("Something went wrong");

        expect(fileTracker.write).not.toHaveBeenCalled();
    });

    it("should throw a ToolError for unknown errors", async () => {
        vi.mocked(fileTracker.assertCanCreate).mockRejectedValue("an unknown error");

        await expect(create.implementation(mockArgs)).rejects.toThrow(
            "An unknown error occurred while creating the file.",
        );

        expect(fileTracker.write).not.toHaveBeenCalled();
    });
});
