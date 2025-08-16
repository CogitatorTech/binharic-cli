// src/agent/tools/definitions/edit.ts
// REFACTORED: Throws errors on failure. Improved logic for replace/delete.

import { z } from "zod";
import type { ToolDef } from "../common.js";
import { ToolError } from "../../errors.js";
import { fileTracker } from "../../fileTracker.js";
import { autofixEdit } from "../../autofix.js";

const replaceActionSchema = z
    .object({
        type: z.literal("replace"),
        search: z.string().describe("The exact block of text to search for."),
        replaceWith: z.string().describe("The text that will replace the 'search' block."),
    })
    .strict();

const insertActionSchema = z
    .object({
        type: z.literal("insert"),
        lineNumber: z
            .number()
            .int()
            .positive()
            .describe("The 1-indexed line number at which to insert the content."),
        content: z.string().describe("The content to insert."),
    })
    .strict();

const deleteActionSchema = z
    .object({
        type: z.literal("delete"),
        content: z.string().describe("The exact block of text to delete from the file."),
    })
    .strict();

const appendActionSchema = z
    .object({
        type: z.literal("append"),
        content: z.string().describe("The content to add to the end of the file."),
    })
    .strict();

const prependActionSchema = z
    .object({
        type: z.literal("prepend"),
        content: z.string().describe("The content to add to the beginning of the file."),
    })
    .strict();

const overwriteActionSchema = z
    .object({
        type: z.literal("overwrite"),
        content: z.string().describe("The new content that will completely overwrite the file."),
    })
    .strict();

const editActionSchema = z
    .discriminatedUnion("type", [
        replaceActionSchema,
        insertActionSchema,
        deleteActionSchema,
        appendActionSchema,
        prependActionSchema,
        overwriteActionSchema,
    ])
    .describe(
        `The specific edit action to perform. This object MUST have a 'type' field. Example: { "type": "replace", "search": "old text", "replaceWith": "new text" }`,
    );

export const editSchema = z.object({
    name: z.literal("edit"),
    arguments: z
        .object({
            path: z.string().describe("The path of the file to edit."),
            edit: editActionSchema,
        })
        .strict(),
});

async function implementation(args: z.infer<typeof editSchema>["arguments"]): Promise<string> {
    try {
        await fileTracker.assertCanEdit(args.path);
        const originalContent = await fileTracker.read(args.path);
        let newContent = "";

        switch (args.edit.type) {
            case "replace": {
                if (!originalContent.includes(args.edit.search)) {
                    const correctedSearch = await autofixEdit(originalContent, args.edit.search);
                    if (correctedSearch) {
                        newContent = originalContent.replace(
                            correctedSearch,
                            args.edit.replaceWith,
                        );
                    } else {
                        throw new ToolError(
                            `The search string was not found in the file and autofix failed.`,
                        );
                    }
                } else {
                    newContent = originalContent.replace(args.edit.search, args.edit.replaceWith);
                }
                break;
            }
            case "insert": {
                const lines = originalContent.split("\n");
                const line = args.edit.lineNumber;
                if (line < 1 || line > lines.length + 1) {
                    throw new ToolError(
                        `Invalid line number ${line}. File has ${lines.length} lines. Must be between 1 and ${lines.length + 1}.`,
                    );
                }
                lines.splice(line - 1, 0, args.edit.content);
                newContent = lines.join("\n");
                break;
            }
            case "delete": {
                if (!originalContent.includes(args.edit.content)) {
                    throw new ToolError(`The content to delete was not found in the file.`);
                }
                newContent = originalContent.replace(args.edit.content, "");
                break;
            }
            case "append":
                newContent = originalContent + args.edit.content;
                break;
            case "prepend":
                newContent = args.edit.content + originalContent;
                break;
            case "overwrite":
                newContent = args.edit.content;
                break;
        }
        await fileTracker.write(args.path, newContent);
        return `Successfully edited file at ${args.path}`;
    } catch (error: unknown) {
        if (error instanceof Error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                throw new ToolError(`File not found at ${args.path}. Use the 'create' tool first.`);
            }
            // Re-throw known ToolErrors, wrap others
            if (error instanceof ToolError) throw error;
            throw new ToolError(error.message);
        }
        throw new ToolError("An unknown error occurred while editing the file.");
    }
}

export default {
    schema: editSchema,
    implementation,
    description: "Edit an existing file.",
} satisfies ToolDef<typeof editSchema>;
