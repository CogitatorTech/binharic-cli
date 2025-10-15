// src/agent/tools/definitions/diff.ts
// File diff tool for comparing files or showing changes

import { z } from "zod";
import { tool } from "ai";
import { ToolError } from "../../errors/index.js";
import logger from "@/logger.js";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";

const execFileAsync = promisify(execFile);

export const diffFilesTool = tool({
    description:
        "Compare two files and show the differences. Reveals the sacred variations between two versions of code. The Omnissiah illuminates the changes.",
    inputSchema: z
        .object({
            file1: z.string().describe("Path to the first file to compare."),
            file2: z.string().describe("Path to the second file to compare."),
            unified: z
                .number()
                .int()
                .positive()
                .optional()
                .default(3)
                .describe("Number of context lines in unified diff format (default: 3)."),
        })
        .strict(),
    execute: async ({ file1, file2, unified = 3 }) => {
        try {
            // Check if files exist
            await Promise.all([fs.access(file1), fs.access(file2)]);

            // Run diff command
            try {
                await execFileAsync("diff", [`-u${unified}`, file1, file2]);
                return "Files are identical. The Machine Spirits are in harmony.";
            } catch (error: unknown) {
                const execError = error as { code?: number; stdout?: string; stderr?: string };
                // diff exits with code 1 when files differ, which is not an error
                if (execError.code === 1 && execError.stdout) {
                    const diff = execError.stdout;
                    if (diff.length > 15000) {
                        return (
                            diff.substring(0, 15000) +
                            "\n\n... (diff truncated - exceeds 15KB. Consider comparing smaller sections)"
                        );
                    }
                    return diff;
                }
                throw new ToolError(`Diff failed: ${execError.stderr || "Unknown error"}`);
            }
        } catch (error) {
            logger.error("Diff failed:", error);
            throw new ToolError(
                `Failed to compare files: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    },
});

export const diffShowChangesTool = tool({
    description:
        "Show uncommitted changes for a specific file or all files. Reveals the pending modifications awaiting sanctification through commit.",
    inputSchema: z
        .object({
            filePath: z
                .string()
                .optional()
                .describe("Optional file path. If not provided, shows all changes."),
        })
        .strict(),
    execute: async ({ filePath }) => {
        try {
            const args = ["diff"];
            if (filePath) {
                args.push("--", filePath);
            }

            const { stdout } = await execFileAsync("git", args);

            if (!stdout || stdout.trim().length === 0) {
                return filePath
                    ? `No changes detected in ${filePath}. The file remains pure and unmodified.`
                    : "No changes detected. The repository is blessed and pristine.";
            }

            if (stdout.length > 15000) {
                return (
                    stdout.substring(0, 15000) +
                    "\n\n... (diff truncated - exceeds 15KB. Use filePath parameter to view specific files)"
                );
            }

            return stdout;
        } catch (error) {
            logger.error("Show changes failed:", error);
            throw new ToolError(
                `Failed to show changes: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    },
});

export default {
    diff_files: diffFilesTool,
    diff_show_changes: diffShowChangesTool,
};
