// src/agent/tools/definitions/create.ts
// REFACTORED: Throws errors on failure instead of returning error strings.

import { z } from "zod";
import { fileTracker } from "../../fileTracker.js";
import type { ToolDef } from "../common.js";
import { ToolError } from "../../errors.js";

const createSchema = z.object({
    name: z.literal("create"),
    arguments: z
        .object({
            path: z.string().describe("The path of the file to create."),
            content: z.string().describe("The initial content of the file."),
        })
        .strict(),
});

async function implementation(args: z.infer<typeof createSchema>["arguments"]): Promise<string> {
    try {
        await fileTracker.assertCanCreate(args.path);
        await fileTracker.write(args.path, args.content);
        return `Successfully created file at ${args.path}`;
    } catch (error: unknown) {
        if (error instanceof Error) {
            // Re-throw known errors or wrap unknown errors in a ToolError.
            throw new ToolError(error.message);
        }
        throw new ToolError("An unknown error occurred while creating the file.");
    }
}

export default {
    schema: createSchema,
    implementation,
    description: "Create a new file.",
} satisfies ToolDef<typeof createSchema>;
