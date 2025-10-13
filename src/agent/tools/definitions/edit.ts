import { z } from "zod";
import { tool } from "ai";
import { ToolError } from "../../errors.js";
import { fileTracker } from "../../fileTracker.js";
import { autofixEdit } from "../../autofix.js";
import logger from "@/logger.js";

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
        line: z
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

export const editTool = tool({
    description:
        "Edit an existing file using structured actions (replace, insert, delete, append, prepend, overwrite). For complex edits, prefer insert_edit_into_file.",
    inputSchema: z
        .object({
            path: z.string().describe("The path of the file to edit."),
            edit: editActionSchema,
        })
        .strict(),
    execute: async ({ path, edit }) => {
        try {
            await fileTracker.assertCanEdit(path);
            const originalContent = await fileTracker.read(path);
            let newContent = "";

            switch (edit.type) {
                case "replace": {
                    if (!originalContent.includes(edit.search)) {
                        // Check if autofix is available and enabled
                        const shouldAttemptAutofix =
                            process.env.OPENAI_API_KEY &&
                            process.env.ENABLE_EDIT_AUTOFIX !== "false";

                        if (shouldAttemptAutofix) {
                            logger.warn(`Search string not found in file. Attempting autofix...`);
                            try {
                                const correctedSearch = await autofixEdit(
                                    originalContent,
                                    edit.search,
                                );
                                if (correctedSearch) {
                                    logger.info(
                                        "Autofix successful, using corrected search string",
                                    );
                                    newContent = originalContent.replace(
                                        correctedSearch,
                                        edit.replaceWith,
                                    );
                                    break;
                                }
                            } catch (autofixError) {
                                logger.error("Autofix threw an error:", autofixError);
                                // Fall through to the error below
                            }
                        }

                        // Autofix failed or disabled
                        throw new ToolError(
                            `The search string was not found in the file. ` +
                                `Expected to find:\n"${edit.search.substring(0, 100)}${edit.search.length > 100 ? "..." : ""}"\n\n` +
                                `Tip: Make sure to provide the EXACT text from the file, or use a different edit type like 'overwrite'.`,
                        );
                    } else {
                        newContent = originalContent.replace(edit.search, edit.replaceWith);
                    }
                    break;
                }
                case "insert": {
                    const lines = originalContent.split("\n");
                    const line = edit.line;
                    if (line < 1 || line > lines.length + 1) {
                        throw new ToolError(
                            `Invalid line number ${line}. File has ${lines.length} lines. Must be between 1 and ${lines.length + 1}.`,
                        );
                    }
                    lines.splice(line - 1, 0, edit.content);
                    newContent = lines.join("\n");
                    break;
                }
                case "delete": {
                    if (!originalContent.includes(edit.content)) {
                        throw new ToolError(`The content to delete was not found in the file.`);
                    }
                    newContent = originalContent.replace(edit.content, "");
                    break;
                }
                case "append":
                    newContent = originalContent + edit.content;
                    break;
                case "prepend":
                    newContent = edit.content + originalContent;
                    break;
                case "overwrite":
                    newContent = edit.content;
                    break;
            }
            await fileTracker.write(path, newContent);
            return `Successfully edited file at ${path}`;
        } catch (error: unknown) {
            if (error instanceof Error) {
                if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                    throw new ToolError(`File not found at ${path}. Use the 'create' tool first.`);
                }
                if (error instanceof ToolError) throw error;
                throw new ToolError(error.message);
            }
            throw new ToolError("An unknown error occurred while editing the file.");
        }
    },
});

export default editTool;
