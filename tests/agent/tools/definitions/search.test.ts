import { describe, expect, it, vi } from "vitest";
import searchTool from "../../../../src/agent/tools/definitions/search";
import { spawn } from "child_process";

vi.mock("child_process");

describe("search tool", () => {
    it("should return a list of files when the search is successful", async () => {
        const mockSpawn = vi.mocked(spawn);
        const mockChildProcess = {
            stdout: {
                on: vi.fn((event, cb) => {
                    if (event === "data") {
                        cb("file1.ts\nfile2.ts");
                    }
                }),
            },
            stderr: {
                on: vi.fn(),
            },
            on: vi.fn((event, cb) => {
                if (event === "close") {
                    cb(0);
                }
            }),
        };
        mockSpawn.mockReturnValue(mockChildProcess as unknown as ReturnType<typeof spawn>);

        const { implementation } = searchTool;
        const result = await implementation({ query: "test" });

        expect(result).toBe("file1.ts\nfile2.ts");
        expect(mockSpawn).toHaveBeenCalledWith(
            "find",
            ["-L", ".", "-type", "f", "-not", "-path", "*.git*", "-name", "*test*", "-print"],
            {
                cwd: process.cwd(),
                shell: false,
                stdio: ["ignore", "pipe", "pipe"],
            },
        );
    });

    it("should return an empty string when no files are found", async () => {
        const mockSpawn = vi.mocked(spawn);
        const mockChildProcess = {
            stdout: {
                on: vi.fn((event, cb) => {
                    if (event === "data") {
                        cb("");
                    }
                }),
            },
            stderr: {
                on: vi.fn(),
            },
            on: vi.fn((event, cb) => {
                if (event === "close") {
                    cb(0);
                }
            }),
        };
        mockSpawn.mockReturnValue(mockChildProcess as unknown as ReturnType<typeof spawn>);

        const { implementation } = searchTool;
        const result = await implementation({ query: "nonexistent", timeout: 10000 });

        expect(result).toBe("No files found.");
    });

    it("should throw a ToolError when the find command fails", async () => {
        const mockSpawn = vi.mocked(spawn);
        const mockChildProcess = {
            stdout: {
                on: vi.fn(),
            },
            stderr: {
                on: vi.fn((event, cb) => {
                    if (event === "data") {
                        cb("find: some error");
                    }
                }),
            },
            on: vi.fn((event, cb) => {
                if (event === "close") {
                    cb(1);
                }
            }),
        };
        mockSpawn.mockReturnValue(mockChildProcess as unknown as ReturnType<typeof spawn>);

        const { implementation } = searchTool;
        await expect(implementation({ query: "test" })).rejects.toThrow(
            "Command exited with code: 1\nOutput:\nfind: some error",
        );
    });

    it("should throw a ToolError when the spawn command fails", async () => {
        const mockSpawn = vi.mocked(spawn);
        mockSpawn.mockImplementation(() => {
            throw new Error("spawn failed");
        });

        const { implementation } = searchTool;
        await expect(implementation({ query: "test" })).rejects.toThrow(
            "Command failed to start: spawn failed",
        );
    });
});
