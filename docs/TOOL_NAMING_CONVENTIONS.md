# Tool Naming Conventions

This document describes the naming conventions for tools in the Tobi project to ensure consistency across the codebase.

## Naming Standard

- **File Names**: Follow TypeScript conventions using **camelCase** (e.g., `readFile.ts`, `insertEditIntoFile.ts`, `systemPrompt.ts`)
- **Tool Names (LLM-facing)**: Use **snake_case** for tool names that the LLM sees (e.g., `read_file`, `insert_edit_into_file`)

This separation allows for idiomatic TypeScript code while maintaining compatibility with LLM tool-calling conventions.

## Why camelCase for File Names?

**TypeScript/JavaScript ecosystem conventions:**

- Standard practice in the TypeScript community
- Better IDE autocomplete and navigation
- Consistent with Node.js module naming
- Easier code reviews (developers expect camelCase)
- Matches other TypeScript projects (React, Next.js, etc.)

**Examples from this codebase:**

- ✅ `systemPrompt.ts` - generates dynamic system prompts
- ✅ `contextWindow.ts` - manages token limits
- ✅ `fileTracker.ts` - tracks file read/write timestamps
- ✅ `readFile.ts` - tool definition file
- ✅ `insertEditIntoFile.ts` - advanced edit tool

## Complete Tool Registry

| Tool Name (LLM)         | File Name (TypeScript)  | Description                                                                 |
| ----------------------- | ----------------------- | --------------------------------------------------------------------------- |
| `read_file`             | `readFile.ts`           | Read the content of a file                                                  |
| `list`                  | `list.ts`               | List files in a directory                                                   |
| `create`                | `create.ts`             | Create a new file                                                           |
| `edit`                  | `edit.ts`               | Edit an existing file (replace, insert, delete, append, prepend, overwrite) |
| `bash`                  | `bash.ts`               | Execute a shell command                                                     |
| `fetch`                 | `fetch.ts`              | Fetch content from a URL                                                    |
| `mcp`                   | `mcp.ts`                | Call a tool on an MCP server                                                |
| `search`                | `search.ts`             | Search for files by name                                                    |
| `insert_edit_into_file` | `insertEditIntoFile.ts` | Smart file editing with minimal hints                                       |
| `run_in_terminal`       | `terminalSession.ts`    | Execute commands in a persistent terminal session                           |
| `get_terminal_output`   | `terminalSession.ts`    | Get output from a background terminal session                               |
| `get_errors`            | `getErrors.ts`          | Get TypeScript/lint errors in files                                         |
| `grep_search`           | `grepSearch.ts`         | Search for text content in files                                            |

## File Structure

```
src/agent/
├── systemPrompt.ts          # Dynamic system prompt generation
├── contextWindow.ts         # Token limit management
├── fileTracker.ts           # File safety tracking
├── autofix.ts               # AI-powered error correction
├── errors.ts                # Custom error classes
├── history.ts               # Conversation history types
├── llm.ts                   # LLM provider abstraction
├── state.ts                 # Application state management
├── types.ts                 # Type definitions
└── tools/
    └── definitions/
        ├── readFile.ts              # read_file tool
        ├── list.ts                  # list tool
        ├── create.ts                # create tool
        ├── edit.ts                  # edit tool
        ├── bash.ts                  # bash tool
        ├── fetch.ts                 # fetch tool
        ├── mcp.ts                   # mcp tool
        ├── search.ts                # search tool
        ├── insertEditIntoFile.ts    # insert_edit_into_file tool
        ├── terminalSession.ts       # run_in_terminal & get_terminal_output
        ├── getErrors.ts             # get_errors tool
        ├── grepSearch.ts            # grep_search tool
        └── index.ts                 # Tool registry
```

## Tool Schema Structure

Each tool must define its schema using Zod with snake_case for the tool name:

```typescript
const toolNameSchema = z.object({
    name: z.literal("tool_name"), // snake_case for LLM
    arguments: z
        .object({
            // Tool-specific arguments
        })
        .strict(),
});
```

## Export Pattern

### Single Tool per File

```typescript
// File: readFile.ts
export default {
    schema: readFileSchema, // Contains name: "read_file"
    implementation,
    description: "Tool description",
} satisfies ToolDef<typeof readFileSchema>;
```

### Multiple Tools per File

```typescript
// File: terminalSession.ts
export const runInTerminal = {
    schema: runInTerminalSchema, // Contains name: "run_in_terminal"
    implementation: runInTerminalImplementation,
    description: "Tool one description",
} satisfies ToolDef<typeof runInTerminalSchema>;

export const getTerminalOutput = {
    schema: getTerminalOutputSchema, // Contains name: "get_terminal_output"
    implementation: getTerminalOutputImplementation,
    description: "Tool two description",
} satisfies ToolDef<typeof getTerminalOutputSchema>;
```

## Registration in index.ts

Tools are imported using camelCase but registered with snake_case keys:

```typescript
// Imports use camelCase file names
import readFile from "./readFile.js";
import insertEditIntoFile from "./insertEditIntoFile.js";

// Registry uses snake_case keys matching tool names
export const toolModules = {
    read_file: readFile, // Key matches tool name in schema
    insert_edit_into_file: insertEditIntoFile,
    // ... other tools
};
```

## Why This Convention?

1. **TypeScript Best Practices**: File names follow JavaScript/TypeScript conventions (camelCase)
2. **LLM Compatibility**: Tool names use snake_case, which is the standard for most LLM APIs
3. **Clear Separation**: Different conventions for different audiences (developers vs. AI models)
4. **Maintainability**: Easy to identify tool files in an IDE
5. **Consistency**: Matches the broader TypeScript ecosystem

## Adding New Tools

When adding a new tool:

1. Create a new file: `src/agent/tools/definitions/yourToolName.ts` (camelCase)
2. Define the tool name in the schema as `z.literal("your_tool_name")` (snake_case)
3. Export the tool using the standard pattern
4. Register the tool in `index.ts` with a snake_case key matching the tool name
5. Create tests in `tests/agent/tools/definitions/yourToolName.test.ts` (camelCase)

## Example: Adding a New Tool

```typescript
// File: src/agent/tools/definitions/gitStatus.ts
const gitStatusSchema = z.object({
    name: z.literal("git_status"), // snake_case for LLM
    arguments: z
        .object({
            showUntracked: z.boolean().optional(),
        })
        .strict(),
});

export default {
    schema: gitStatusSchema,
    implementation: async (args) => {
        /* ... */
    },
    description: "Get git repository status",
} satisfies ToolDef<typeof gitStatusSchema>;
```

```typescript
// In index.ts
import gitStatus from "./gitStatus.js"; // camelCase import

export const toolModules = {
    git_status: gitStatus, // snake_case key
    // ...
};
```

---

_Last updated: October 13, 2025_
