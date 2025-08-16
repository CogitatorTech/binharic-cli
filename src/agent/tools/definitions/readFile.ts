// src/agent/tools/definitions/read_file.ts
// REFACTORED: Throws an error on failure.

import { z } from "zod";
import { fileTracker } from "../../fileTracker.js";
import type { ToolDef } from "../common.js";
import { ToolError } from "@/agent/errors.js";

const readFileSchema = z.object({
    name: z.literal("read_file"),
    arguments: z
        .object({
            path: z.string().describe("The path to the file to read."),
        })
        .strict(),
});

async function implementation(args: z.infer<typeof readFileSchema>["arguments"]): Promise<string> {
    try {
        return await fileTracker.read(args.path);
    } catch (error: unknown) {
        if (error instanceof Error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                throw new ToolError(`File not found at path: ${args.path}`);
            }
            throw new ToolError(`Error reading file: ${error.message}`);
        }
        throw new ToolError("An unknown error occurred while reading the file.");
    }
}

export default {
    schema: readFileSchema,
    implementation,
    description: "Read the content of a file.",
} satisfies ToolDef<typeof readFileSchema>;
