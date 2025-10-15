import { z } from "zod";
import { tool } from "ai";
import fs from "fs/promises";
import { ToolError } from "@/agent/errors.js";

export const listTool = tool({
    description: "List files in a directory.",
    inputSchema: z
        .object({
            path: z
                .string()
                .optional()
                .describe("The path to the directory to list. Defaults to the current directory."),
        })
        .strict(),
    execute: async ({ path }: { path?: string }) => {
        const targetPath = path || process.cwd();
        try {
            const stat = await fs.stat(targetPath);
            if (!stat.isDirectory()) {
                throw new ToolError(`'${targetPath}' is not a directory.`);
            }
            const files = await fs.readdir(targetPath);
            if (files.length === 0) {
                return "Directory is empty.";
            }
            return files.join("\n");
        } catch (error: unknown) {
            if (error instanceof Error) {
                if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                    throw new ToolError(`Directory not found at path: ${targetPath}`);
                }
                throw new ToolError(`Error listing files: ${error.message}`);
            }
            throw new ToolError("An unknown error occurred while listing files.");
        }
    },
});

export default listTool;
