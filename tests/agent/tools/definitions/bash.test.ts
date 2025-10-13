import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import bash from "@/agent/tools/definitions/bash";
import { ToolError } from "@/agent/errors";
import { ChildProcess, spawn } from "child_process";
import { EventEmitter } from "events";

vi.mock("child_process", () => ({
    spawn: vi.fn(),
}));

describe("bash tool", () => {
    let spawnMock: ReturnType<typeof vi.fn>;
    let childProcessMock: ChildProcess;
    let stdoutMock: EventEmitter;
    let stderrMock: EventEmitter;

    beforeEach(() => {
        childProcessMock = new EventEmitter() as ChildProcess;
        stdoutMock = new EventEmitter();
        stderrMock = new EventEmitter();
        (childProcessMock as any).stdout = stdoutMock;
        (childProcessMock as any).stderr = stderrMock;

        spawnMock = vi.mocked(spawn).mockReturnValue(childProcessMock);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it("should resolve with output on successful execution and use default timeout", async () => {
        const args = bash.schema.shape.arguments.parse({ cmd: "ls -l" });
        const promise = bash.implementation(args);

        stdoutMock.emit("data", "file1.txt");
        stdoutMock.emit("data", "file2.txt");
        childProcessMock.emit("close", 0);

        await expect(promise).resolves.toBe("file1.txtfile2.txt");
        expect(spawnMock).toHaveBeenCalledWith("ls -l", {
            cwd: process.cwd(),
            shell: "/bin/bash",
            stdio: ["ignore", "pipe", "pipe"],
            timeout: 30000,
        });
    });

    it("should use provided timeout", async () => {
        const args = bash.schema.shape.arguments.parse({ cmd: "sleep 5", timeout: 5000 });
        const promise = bash.implementation(args);

        childProcessMock.emit("close", 0);

        await expect(promise).resolves.toBe("Command executed successfully with no output.");
        expect(spawnMock).toHaveBeenCalledWith("sleep 5", {
            cwd: process.cwd(),
            shell: "/bin/bash",
            stdio: ["ignore", "pipe", "pipe"],
            timeout: 5000,
        });
    });

    it("should reject with ToolError on non-zero exit code", async () => {
        const args = bash.schema.shape.arguments.parse({ cmd: "ls non_existent_dir" });
        const promise = bash.implementation(args);

        stderrMock.emit("data", "ls: cannot access 'non_existent_dir': No such file or directory");
        childProcessMock.emit("close", 2);

        await expect(promise).rejects.toThrow(ToolError);
        await expect(promise).rejects.toThrow(
            "Command exited with code: 2\nOutput:\nls: cannot access 'non_existent_dir': No such file or directory",
        );
    });

    it("should reject with ToolError on command start error", async () => {
        const error = new Error("spawn ENOENT");
        const args = bash.schema.shape.arguments.parse({ cmd: "invalid_command" });
        const promise = bash.implementation(args);

        childProcessMock.emit("error", error);

        await expect(promise).rejects.toThrow(ToolError);
        await expect(promise).rejects.toThrow(`Command failed to start: ${error.message}`);
    });

    it("should handle stderr output correctly", async () => {
        const args = bash.schema.shape.arguments.parse({ cmd: "some_command" });
        const promise = bash.implementation(args);

        stderrMock.emit("data", "some error");
        childProcessMock.emit("close", 1);

        await expect(promise).rejects.toThrow("Command exited with code: 1\nOutput:\nsome error");
    });
});
