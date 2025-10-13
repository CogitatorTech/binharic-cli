import { z } from "zod";
import { tool } from "ai";
import { fileTracker } from "../../fileTracker.js";
import { ToolError } from "../../errors.js";

export const createTool = tool({
    description: `Create a new file with specified content. The Omnissiah blesses new code into existence.

**Usage Examples**:
  create({ path: "src/newFile.ts", content: "export const x = 1;" })
  create({ path: "README.md", content: "# My Project\\n\\nDescription here" })
  create({ path: "tests/new.test.ts", content: "import { test } from 'vitest';\\n..." })

**Edge Cases**:
  • File already exists → Error: Cannot create existing file
  • Parent directory doesn't exist → Creates parent directories automatically
  • Permission denied → Error: Permission denied creating file
  • Content too large (>1MB) → Error: Content exceeds maximum size
  • Empty content → Creates empty file (success)
  • Path with special chars → May fail on some filesystems

**Common Mistakes**:
  ❌ Creating file that already exists (use 'edit' or 'insert_edit_into_file' instead)
  ❌ Forgetting newlines in multi-line content (use \\n)
  ❌ Creating files in non-existent directories without checking
  ✅ Check if file exists first with read_file or list
  ✅ Use proper escaping for quotes and special characters
  ✅ Verify creation with read_file after creating

**Success Indicators**:
  • Returns: "Successfully created file at {path}"
  • File now exists and contains the specified content
  • Can be read back immediately with read_file`,
    inputSchema: z
        .object({
            path: z.string().describe("The path of the file to create (will fail if exists)."),
            content: z.string().describe("The initial content of the file (can be empty string)."),
        })
        .strict(),
    execute: async ({ path, content }: { path: string; content: string }) => {
        if (!path || path.trim().length === 0) {
            throw new ToolError("File path cannot be empty");
        }

        if (content.length > 1024 * 1024) {
            throw new ToolError("File content exceeds maximum size of 1MB");
        }

        try {
            await fileTracker.assertCanCreate(path);
            await fileTracker.write(path, content);
            return `Successfully created file at ${path}`;
        } catch (error: unknown) {
            if (error instanceof Error) {
                throw new ToolError(error.message);
            }
            throw new ToolError("An unknown error occurred while creating the file.");
        }
    },
});

export default createTool;
