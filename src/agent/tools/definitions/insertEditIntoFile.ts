// src/agent/tools/definitions/insertEdit.ts
// Advanced file editing tool with smart diff application

import { z } from "zod";
import type { ToolDef } from "../common.js";
import { ToolError } from "../../errors.js";
import { fileTracker } from "../../fileTracker.js";

const insertEditSchema = z.object({
    name: z.literal("insert_edit_into_file"),
    arguments: z
        .object({
            filePath: z.string().describe("The absolute path of the file to edit."),
            code: z
                .string()
                .describe(
                    "The code change to apply. Use comments like // ...existing code... to represent unchanged regions. Be as concise as possible.",
                ),
            explanation: z.string().describe("A short explanation of the edit being made."),
        })
        .strict(),
});

async function implementation(
    args: z.infer<typeof insertEditSchema>["arguments"],
): Promise<string> {
    try {
        await fileTracker.assertCanEdit(args.filePath);
        const originalContent = await fileTracker.read(args.filePath);

        const newContent = applySmartEdit(originalContent, args.code);

        await fileTracker.write(args.filePath, newContent);
        return `Successfully edited file at ${args.filePath}. ${args.explanation}`;
    } catch (error: unknown) {
        if (error instanceof Error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                throw new ToolError(
                    `File not found at ${args.filePath}. Use the 'create_file' tool first.`,
                );
            }
            if (error instanceof ToolError) throw error;
            throw new ToolError(error.message);
        }
        throw new ToolError("An unknown error occurred while editing the file.");
    }
}

function applySmartEdit(originalContent: string, editCode: string): string {
    const cleanedEdit = editCode
        .split("\n")
        .filter((line) => !line.trim().match(/^\/\/\s*\.\.\.existing code\.\.\./))
        .filter((line) => !line.trim().match(/^#\s*\.\.\.existing code\.\.\./))
        .filter((line) => !line.trim().match(/^<!--\s*\.\.\.existing code\.\.\.\s*-->/))
        .join("\n");

    const lines = originalContent.split("\n");
    const editLines = cleanedEdit.split("\n");

    if (editLines.length < lines.length * 0.3) {
        const firstNonEmptyLines = editLines
            .filter((line) => line.trim())
            .slice(0, Math.min(2, editLines.length));

        if (firstNonEmptyLines.length > 0) {
            const searchPattern = firstNonEmptyLines.join("\n");
            const index = originalContent.indexOf(searchPattern);

            if (index !== -1) {
                const endIndex = index + searchPattern.length;
                const nextNewline = originalContent.indexOf("\n", endIndex);
                const endPoint = nextNewline !== -1 ? nextNewline : originalContent.length;

                return (
                    originalContent.substring(0, index) +
                    cleanedEdit +
                    originalContent.substring(endPoint)
                );
            }
        }
    }

    return cleanedEdit;
}

export default {
    schema: insertEditSchema,
    implementation,
    description:
        "Edit a file with smart diff application. The system understands how to apply edits with minimal hints.",
} satisfies ToolDef<typeof insertEditSchema>;
