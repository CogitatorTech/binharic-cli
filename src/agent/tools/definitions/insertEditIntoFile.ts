// src/agent/tools/definitions/insertEdit.ts
// Advanced file editing tool with smart diff application

import { z } from "zod";
import { tool } from "ai";
import { ToolError } from "../../errors/index.js";
import { fileTracker } from "../../core/fileTracker.js";

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

    if (editLines.length === 0 || cleanedEdit.trim().length === 0) {
        throw new ToolError(
            "Edit code is empty after removing markers. Provide actual code to insert.",
        );
    }

    const SIMILARITY_THRESHOLD = 0.3;
    if (editLines.length < lines.length * SIMILARITY_THRESHOLD) {
        const firstNonEmptyLines = editLines
            .filter((line) => line.trim())
            .slice(0, Math.min(3, editLines.length));

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

            const FUZZY_MATCH_THRESHOLD = 0.7;
            const matchResult = findBestMatch(
                originalContent,
                searchPattern,
                FUZZY_MATCH_THRESHOLD,
            );
            if (matchResult.found) {
                return (
                    originalContent.substring(0, matchResult.startIndex) +
                    cleanedEdit +
                    originalContent.substring(matchResult.endIndex)
                );
            }
        }
    }

    if (cleanedEdit.length >= originalContent.length * 0.8) {
        return cleanedEdit;
    }

    throw new ToolError(
        "Could not find a safe location to apply the edit. The edit context does not match the file content. " +
            "Please read the file first and provide more specific context, or use the 'edit' tool with 'overwrite' action.",
    );
}

function findBestMatch(
    content: string,
    pattern: string,
    threshold: number,
): { found: boolean; startIndex: number; endIndex: number } {
    const contentLines = content.split("\n");
    const patternLines = pattern.split("\n");

    let bestScore = 0;
    let bestIndex = -1;

    for (let i = 0; i <= contentLines.length - patternLines.length; i++) {
        const segment = contentLines.slice(i, i + patternLines.length).join("\n");
        const score = calculateSimilarity(segment, pattern);

        if (score > bestScore && score >= threshold) {
            bestScore = score;
            bestIndex = i;
        }
    }

    if (bestIndex !== -1) {
        const startIndex =
            contentLines.slice(0, bestIndex).join("\n").length + (bestIndex > 0 ? 1 : 0);
        const matchLength = contentLines
            .slice(bestIndex, bestIndex + patternLines.length)
            .join("\n").length;
        return {
            found: true,
            startIndex,
            endIndex: startIndex + matchLength,
        };
    }

    return { found: false, startIndex: -1, endIndex: -1 };
}

function calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1,
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

export default insertEditIntoFileTool;
