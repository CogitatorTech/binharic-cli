import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { runTool } from "@/agent/tools/index.js";
import { loadConfig } from "@/config.js";
import type { Config } from "@/config.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

describe("Tool Input Validation", () => {
    let config: Config;
    let testDir: string;

    beforeEach(async () => {
        config = await loadConfig();
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), "tool-validation-test-"));
    });

    afterEach(async () => {
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (error) {}
    });

    describe("bash tool validation", () => {
        it("should reject empty commands", async () => {
            await expect(runTool({ toolName: "bash", args: { cmd: "" } }, config)).rejects.toThrow(
                "Cannot execute empty command",
            );
        });

        it("should reject commands exceeding max length", async () => {
            const longCommand = "echo " + "a".repeat(10001);
            await expect(
                runTool({ toolName: "bash", args: { cmd: longCommand } }, config),
            ).rejects.toThrow("exceeds maximum length");
        });

        it("should reject dangerous rm commands", async () => {
            await expect(
                runTool({ toolName: "bash", args: { cmd: "rm -rf /" } }, config),
            ).rejects.toThrow("Dangerous rm command detected");
        });

        it("should reject mkfs commands", async () => {
            await expect(
                runTool({ toolName: "bash", args: { cmd: "mkfs /dev/sda1" } }, config),
            ).rejects.toThrow("Filesystem formatting detected");
        });

        it("should reject fork bombs", async () => {
            await expect(
                runTool({ toolName: "bash", args: { cmd: ":(){ :|:& };:" } }, config),
            ).rejects.toThrow("Fork bomb pattern detected");
        });

        it("should allow safe commands", async () => {
            const result = await runTool(
                { toolName: "bash", args: { cmd: "echo 'test'" } },
                config,
            );
            expect(result).toContain("test");
        });
    });

    describe("create tool validation", () => {
        it("should reject empty file paths", async () => {
            await expect(
                runTool({ toolName: "create", args: { path: "", content: "test" } }, config),
            ).rejects.toThrow("File path cannot be empty");
        });

        it("should reject content exceeding max size", async () => {
            const largeContent = "a".repeat(1024 * 1024 + 1);
            const filePath = path.join(testDir, "large.txt");

            await expect(
                runTool(
                    { toolName: "create", args: { path: filePath, content: largeContent } },
                    config,
                ),
            ).rejects.toThrow("exceeds maximum size");
        });

        it("should create files with valid input", async () => {
            const filePath = path.join(testDir, "valid.txt");
            const result = await runTool(
                { toolName: "create", args: { path: filePath, content: "test content" } },
                config,
            );

            expect(result).toContain("Successfully created");
            const content = await fs.readFile(filePath, "utf-8");
            expect(content).toBe("test content");
        });
    });

    describe("read_file tool validation", () => {
        it("should reject empty file paths", async () => {
            await expect(
                runTool({ toolName: "read_file", args: { path: "" } }, config),
            ).rejects.toThrow("File path cannot be empty");
        });

        it("should handle non-existent files", async () => {
            await expect(
                runTool({ toolName: "read_file", args: { path: "/nonexistent/file.txt" } }, config),
            ).rejects.toThrow("File not found");
        });

        it("should truncate large files", async () => {
            const largeContent = "a".repeat(1024 * 1024 + 1000);
            const filePath = path.join(testDir, "large.txt");
            await fs.writeFile(filePath, largeContent);

            const result = await runTool(
                { toolName: "read_file", args: { path: filePath } },
                config,
            );
            expect(typeof result).toBe("string");
            expect((result as string).includes("File truncated")).toBe(true);
        });

        it("should read valid files", async () => {
            const filePath = path.join(testDir, "test.txt");
            await fs.writeFile(filePath, "test content");

            const result = await runTool(
                { toolName: "read_file", args: { path: filePath } },
                config,
            );
            expect(result).toBe("test content");
        });
    });

    describe("insert_edit_into_file tool validation", () => {
        it("should reject empty file paths", async () => {
            await expect(
                runTool(
                    {
                        toolName: "insert_edit_into_file",
                        args: { filePath: "", code: "test", explanation: "test" },
                    },
                    config,
                ),
            ).rejects.toThrow("File path cannot be empty");
        });

        it("should reject empty code content", async () => {
            const filePath = path.join(testDir, "test.txt");
            await fs.writeFile(filePath, "original");

            await expect(
                runTool(
                    {
                        toolName: "insert_edit_into_file",
                        args: { filePath, code: "", explanation: "test" },
                    },
                    config,
                ),
            ).rejects.toThrow("Code content cannot be empty");
        });

        it("should reject code exceeding max size", async () => {
            const filePath = path.join(testDir, "test.txt");
            await fs.writeFile(filePath, "original");
            const largeCode = "a".repeat(1024 * 1024 + 1);

            await expect(
                runTool(
                    {
                        toolName: "insert_edit_into_file",
                        args: { filePath, code: largeCode, explanation: "test" },
                    },
                    config,
                ),
            ).rejects.toThrow("exceeds maximum size");
        });
    });
});
