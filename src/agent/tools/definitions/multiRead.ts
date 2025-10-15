// src/agent/tools/definitions/multiRead.ts
// Multi-file read tool for batch file reading

import { z } from "zod";
import { tool } from "ai";
import { ToolError } from "../../errors/index.js";
import logger from "@/logger.js";
import fs from "fs/promises";
import path from "path";

export const readMultipleFilesTool = tool({
    description:
        "Read multiple files at once and return their contents. Efficient for gathering context from multiple sources. The Omnissiah reveals the sacred texts in batch.",
    inputSchema: z
        .object({
            filePaths: z
                .array(z.string())
                .min(1)
                .max(20)
                .describe("Array of file paths to read (max 20 files)."),
            includeLineNumbers: z
                .boolean()
                .optional()
                .default(false)
                .describe("Include line numbers in output."),
        })
        .strict(),
    execute: async ({ filePaths, includeLineNumbers = false }) => {
        try {
            const results = await Promise.all(
                filePaths.map(async (filePath) => {
                    try {
                        const absolutePath = path.resolve(filePath);
                        const stats = await fs.stat(absolutePath);

                        if (!stats.isFile()) {
                            return {
                                path: filePath,
                                error: "Not a file",
                                content: null,
                            };
                        }

                        // Check file size (max 500KB per file)
                        if (stats.size > 500 * 1024) {
                            return {
                                path: filePath,
                                error: "File too large (>500KB). Use read_file for large files.",
                                content: null,
                            };
                        }

                        let content = await fs.readFile(absolutePath, "utf-8");

                        if (includeLineNumbers) {
                            const lines = content.split("\n");
                            content = lines
                                .map(
                                    (line, idx) =>
                                        `${(idx + 1).toString().padStart(4, " ")} | ${line}`,
                                )
                                .join("\n");
                        }

                        return {
                            path: filePath,
                            error: null,
                            content,
                        };
                    } catch (error) {
                        return {
                            path: filePath,
                            error: error instanceof Error ? error.message : "Unknown error",
                            content: null,
                        };
                    }
                }),
            );

            // Format output
            const output = results.map((result) => {
                const separator = "=".repeat(80);
                const header = `\n${separator}\nFile: ${result.path}\n${separator}\n`;

                if (result.error) {
                    return `${header}ERROR: ${result.error}\n`;
                }

                return `${header}${result.content}\n`;
            });

            const successCount = results.filter((r) => !r.error).length;
            const errorCount = results.filter((r) => r.error).length;

            const summary =
                `\n${"=".repeat(80)}\n` +
                `Summary: ${successCount} files read successfully, ${errorCount} errors\n` +
                `Total files: ${filePaths.length}\n` +
                `${"=".repeat(80)}`;

            return output.join("\n") + summary;
        } catch (error) {
            logger.error("Multi-file read failed:", error);
            throw new ToolError(
                `Failed to read multiple files: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    },
});

export default {
    read_multiple_files: readMultipleFilesTool,
};
