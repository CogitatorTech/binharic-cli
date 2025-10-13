// src/agent/tools/definitions/insertEdit.ts
// Advanced file editing tool with smart diff application

import { z } from "zod";
import { tool } from "ai";
import { ToolError } from "../../errors.js";
import { fileTracker } from "../../fileTracker.js";

export const insertEditIntoFileTool = tool({
    description: `Edit a file with smart diff application. The system intelligently applies your changes with minimal hints.

**Usage Examples**:
  // Simple function edit
  insert_edit_into_file({
    filePath: "src/app.ts",
    code: "function hello() {\\n  // ...existing code...\\n  console.log('Updated!');\\n  // ...existing code...\\n}",
    explanation: "Add logging to hello function"
  })

  // Add new import
  insert_edit_into_file({
    filePath: "src/utils.ts",
    code: "import { newUtil } from './new';\\n// ...existing code...",
    explanation: "Add new import statement"
  })

  // Replace specific section
  insert_edit_into_file({
    filePath: "config.json",
    code: '{\\"port\\": 8080}',
    explanation: "Update port configuration"
  })

**How It Works**:
  • Use comments like "// ...existing code..." to represent unchanged regions
  • System finds where your changes fit and applies them intelligently
  • Supports multiple languages (TypeScript, Python, JSON, etc.)
  • Comment styles: // (JS/TS), # (Python), <!-- --> (HTML/XML)

**Edge Cases**:
  • File doesn't exist → Error: "File not found, use create tool first"
  • Edit too large (>1MB) → Error: Content exceeds maximum size
  • Ambiguous context → May apply edit to wrong location (verify after!)
  • No matching context → Might replace entire file (verify after!)

**Common Mistakes**:
  ❌ Not using ...existing code... markers (may replace entire file)
  ❌ Forgetting to escape quotes in JSON strings
  ❌ Not reading file first to understand structure
  ❌ Making changes without verifying with read_file after
  ✅ ALWAYS read the file first to see current content
  ✅ Use specific context (2-3 lines before/after) for precision
  ✅ ALWAYS verify changes by reading file back after editing
  ✅ Use clear, descriptive explanations for your changes

**Success Indicators**:
  • Returns: "Successfully edited file at {path}. {explanation}"
  • Verify by reading file back with read_file
  • Run get_errors to ensure no syntax errors introduced
  • Test the changes with run_in_terminal if applicable

**CRITICAL**: Always verify edits by reading the file back. The smart diff may not apply exactly as intended.`,
    inputSchema: z
        .object({
            filePath: z.string().describe("The absolute path of the file to edit (must exist)."),
            code: z
                .string()
                .describe(
                    "The code change to apply. Use comments like '// ...existing code...' to represent unchanged regions. Be concise and provide enough context for precise placement.",
                ),
            explanation: z
                .string()
                .describe("A clear, short explanation of what you're changing and why."),
        })
        .strict(),
    execute: async ({ filePath, code, explanation }) => {
        if (!filePath || filePath.trim().length === 0) {
            throw new ToolError("File path cannot be empty");
        }

        if (!code || code.trim().length === 0) {
            throw new ToolError("Code content cannot be empty");
        }

        if (code.length > 1024 * 1024) {
            throw new ToolError("Code content exceeds maximum size of 1MB");
        }

        try {
            await fileTracker.assertCanEdit(filePath);
            const originalContent = await fileTracker.read(filePath);

            const newContent = applySmartEdit(originalContent, code);

            await fileTracker.write(filePath, newContent);
            return `Successfully edited file at ${filePath}. ${explanation}`;
        } catch (error: unknown) {
            if (error instanceof Error) {
                if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                    throw new ToolError(
                        `File not found at ${filePath}. Use the 'create' tool first.`,
                    );
                }
                if (error instanceof ToolError) throw error;
                throw new ToolError(error.message);
            }
            throw new ToolError("An unknown error occurred while editing the file.");
        }
    },
});

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

export default insertEditIntoFileTool;
