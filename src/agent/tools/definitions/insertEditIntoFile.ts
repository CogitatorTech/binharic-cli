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

        // Smart diff application logic
        let newContent = applySmartEdit(originalContent, args.code);

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
    // Remove comment markers that indicate unchanged code
    const cleanedEdit = editCode
        .split("\n")
        .filter((line) => !line.trim().match(/^\/\/\s*\.\.\.existing code\.\.\./))
        .filter((line) => !line.trim().match(/^#\s*\.\.\.existing code\.\.\./))
        .filter((line) => !line.trim().match(/^<!--\s*\.\.\.existing code\.\.\.\s*-->/))
        .join("\n");

    // Try to intelligently merge the edit with the original
    const lines = originalContent.split("\n");
    const editLines = cleanedEdit.split("\n");

    // Simple heuristic: if edit is shorter, try to find matching context and replace
    if (editLines.length < lines.length * 0.8) {
        // Look for the first few lines of the edit in the original
        const searchStart = editLines.slice(0, Math.min(3, editLines.length)).join("\n");
        if (originalContent.includes(searchStart)) {
            // Found a match - this is likely a targeted edit
            return originalContent.replace(searchStart, cleanedEdit);
        }
    }

    // If no smart match found, return the edit as-is (full replacement)
    return cleanedEdit;
}

export default {
    schema: insertEditSchema,
    implementation,
    description:
        "Edit a file with smart diff application. The system understands how to apply edits with minimal hints.",
} satisfies ToolDef<typeof insertEditSchema>;
