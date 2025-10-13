import { z } from "zod";
import { tool } from "ai";
import { validate, type ValidationStrategy } from "@/agent/validation.js";
import { ToolError } from "@/agent/errors.js";

export const validateTool = tool({
    description:
        "Validate the results of previous operations to ensure they worked correctly. Use this after file edits, creations, or deletions to verify success. This implements ground truth feedback by checking that your actions had the intended effect.",
    inputSchema: z
        .object({
            type: z
                .enum([
                    "file-edit",
                    "file-creation",
                    "file-deletion",
                    "typescript",
                    "build",
                    "tests",
                ])
                .describe(
                    "Type of validation: 'file-edit' (verify file was edited), 'file-creation' (verify file exists), 'file-deletion' (verify file was removed), 'typescript' (check TS compilation), 'build' (run project build), 'tests' (run test suite)",
                ),
            filePath: z
                .string()
                .optional()
                .describe(
                    "Path to file being validated (required for file operations and typescript)",
                ),
            expectedContent: z
                .string()
                .optional()
                .describe(
                    "Optional content that should be present in the file (for file-edit validation)",
                ),
            testPattern: z
                .string()
                .optional()
                .describe("Optional test file pattern to run (for tests validation)"),
        })
        .strict(),
    execute: async ({ type, filePath, expectedContent, testPattern }) => {
        try {
            const strategy: ValidationStrategy = {
                type,
                filePath,
                expectedContent,
                testPattern,
            };

            const result = await validate(strategy);

            if (!result.success) {
                return `❌ Validation Failed: ${result.message}\n\nDetails: ${JSON.stringify(result.details, null, 2)}`;
            }

            return `✅ Validation Successful: ${result.message}\n\nDetails: ${JSON.stringify(result.details, null, 2)}`;
        } catch (error: unknown) {
            if (error instanceof Error) {
                throw new ToolError(`Validation error: ${error.message}`);
            }
            throw new ToolError("An unknown error occurred during validation.");
        }
    },
});

export default validateTool;
