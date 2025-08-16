// src/agent/tools/definitions/list.ts
// REFACTORED: Throws an error on failure.

import { z } from "zod";
import fs from "fs/promises";
import type { ToolDef } from "../common.js";
import { ToolError } from "@/agent/errors.js";

const listSchema = z.object({
    name: z.literal("list"),
    arguments: z
        .object({
            path: z
                .string()
                .optional()
                .describe("The path to the directory to list. Defaults to the current directory."),
        })
        .strict(),
});

async function implementation(args: z.infer<typeof listSchema>["arguments"]): Promise<string> {
    const targetPath = args.path || process.cwd();
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
}

export default {
    schema: listSchema,
    implementation,
    description: "List files in a directory.",
} satisfies ToolDef<typeof listSchema>;
