import { describe, expect, it, vi, beforeEach } from "vitest";
import searchTool from "../../../../src/agent/tools/definitions/search";
import { ChildProcess } from "child_process";
import { EventEmitter } from "events";

vi.mock("child_process", () => ({
    spawn: vi.fn(),
}));

describe("search tool", () => {
    let childProcessMock: ChildProcess;
    let stdoutMock: EventEmitter;
    let stderrMock: EventEmitter;

    beforeEach(async () => {
        vi.clearAllMocks();

        const { spawn } = vi.mocked(await import("child_process"));

        childProcessMock = new EventEmitter() as ChildProcess;
        stdoutMock = new EventEmitter();
        stderrMock = new EventEmitter();
        (childProcessMock as any).stdout = stdoutMock;
        (childProcessMock as any).stderr = stderrMock;
        (childProcessMock as any).kill = vi.fn();

        vi.mocked(spawn).mockReturnValue(childProcessMock);
    });

    it("should return a list of files when the search is successful", async () => {
        const promise = searchTool.execute!({ query: "test", timeout: 10000 }, {} as any);

        stdoutMock.emit("data", "file1.ts\n");
        stdoutMock.emit("data", "file2.ts\n");
        childProcessMock.emit("close", 0);

        const result = await promise;

        expect(result).toBe("file1.ts\nfile2.ts\n");
    });

    it("should return 'No files found' when no files are found", async () => {
        const promise = searchTool.execute!({ query: "nonexistent", timeout: 10000 }, {} as any);

        childProcessMock.emit("close", 0);

        const result = await promise;

        expect(result).toBe("No files found.");
    });

    it("should throw a ToolError when the find command fails", async () => {
        const promise = searchTool.execute!({ query: "test", timeout: 10000 }, {} as any);

        stderrMock.emit("data", "find: some error");
        childProcessMock.emit("close", 1);

        await expect(promise).rejects.toThrow(
            "Command exited with code: 1\nOutput:\nfind: some error",
        );
    });

    it("should throw a ToolError when the spawn command fails", async () => {
        const promise = searchTool.execute!({ query: "test", timeout: 10000 }, {} as any);

        childProcessMock.emit("error", new Error("spawn failed"));

        await expect(promise).rejects.toThrow("Command failed to start: spawn failed");
    });

    it("should timeout if search takes too long", async () => {
        vi.useFakeTimers();

        const promise = searchTool.execute!({ query: "test", timeout: 100 }, {} as any);

        vi.advanceTimersByTime(150);

        await expect(promise).rejects.toThrow("Search timed out after 100ms");

        vi.useRealTimers();
    });
});
