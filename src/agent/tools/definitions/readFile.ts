import { z } from "zod";
import { tool } from "ai";
import { fileTracker } from "../../core/fileTracker.js";
import { ToolError } from "@/agent/errors/index.js";

export const readFileTool = tool({
    description: `Read the content of a file. The Machine Spirit reveals the sacred text.

**Usage Examples**:
  read_file({ path: "src/app.ts" })
  read_file({ path: "/absolute/path/to/file.txt" })
  read_file({ path: "./relative/path/config.json" })

**Edge Cases**:
  • File doesn't exist → Error: "File not found at path: {path}"
  • Permission denied → Error: "Permission denied reading file: {path}"
  • Binary file → May return garbled text or error
  • File too large (>1MB) → Returns first 1MB with truncation notice
  • Empty file → Returns empty string (success)

**Common Mistakes**:
  ❌ Reading binary files (images, PDFs) - use specialized tools
  ❌ Forgetting to check if file exists first with 'list' tool
  ❌ Using paths with special characters without proper escaping
  ✅ Use absolute paths when possible for clarity
  ✅ Check directory contents with 'list' first if unsure
  ✅ Use read_multiple_files for batch operations

**Success Indicators**:
  • Returns file content as string
  • No errors means file was successfully read
  • Empty return = empty file (not an error)`,
    inputSchema: z
        .object({
            path: z
                .string()
                .describe("The path to the file to read (absolute or relative to cwd)."),
        })
        .strict(),
    execute: async ({ path }: { path: string }) => {
        if (!path || path.trim().length === 0) {
            throw new ToolError("File path cannot be empty");
        }

        try {
            const content = await fileTracker.read(path);

            if (content.length > 1024 * 1024) {
                return (
                    content.substring(0, 1024 * 1024) +
                    "\n\n[File truncated - exceeds 1MB. Use a more specific tool or read in chunks]"
                );
            }

            return content;
        } catch (error: unknown) {
            if (error instanceof Error) {
                if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                    throw new ToolError(`File not found at path: ${path}`);
                }
                if ((error as NodeJS.ErrnoException).code === "EACCES") {
                    throw new ToolError(`Permission denied reading file: ${path}`);
                }
                throw new ToolError(`Error reading file: ${error.message}`);
            }
            throw new ToolError("An unknown error occurred while reading the file.");
        }
    },
});

export default readFileTool;
