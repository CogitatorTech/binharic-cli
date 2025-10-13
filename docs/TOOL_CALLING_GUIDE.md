# Tool Calling Implementation Guide

## Overview

This document describes how Binharic CLI implements AI SDK 5 tool calling, following best practices from the official AI SDK documentation.

## Tool Structure

### Basic Tool Components

Every tool in Binharic CLI has three main elements:

1. **`description`**: Influences when the tool is selected by the LLM
2. **`inputSchema`**: Zod schema defining and validating input parameters
3. **`execute`**: Async function that performs the tool's action

### Example Tool Definition

```typescript
import { tool } from "ai";
import { z } from "zod";

export const createTool = tool({
    description: "Create a new file.",
    inputSchema: z
        .object({
            path: z.string().describe("The path of the file to create."),
            content: z.string().describe("The initial content of the file."),
        })
        .strict(),
    execute: async ({ path, content }) => {
        // Tool implementation
        await fileTracker.write(path, content);
        return `Successfully created file at ${path}`;
    },
});
```

## Multi-Step Tool Calls

### How Multi-Step Works

Binharic CLI uses `stopWhen: stepCountIs(20)` to enable multi-step tool interactions:

1. **Step 1**: User prompt → Model generates tool call → Tool executes
2. **Step 2**: Tool result → Model considers result → Model responds or calls another tool
3. **Step N**: Process continues until completion or step limit reached

### Implementation in Binharic

```typescript
const agent = new Agent({
    model: llmProvider,
    system: systemPrompt,
    tools: {
        ...tools,
        execute_workflow: workflowTool,
    },
    stopWhen: [
        stepCountIs(20),
        createBudgetStopCondition(1.0),
        createErrorThresholdCondition(5),
        createValidationStopCondition(),
        createCompletionCondition(),
    ],
    // ...
});
```

## Tool Execution Flow

### 1. Tool Call Reception

When the LLM generates a tool call, Binharic receives it with:

- `toolCallId`: Unique identifier for tracking
- `toolName`: Name of the tool to execute
- `args`: Input arguments matching the schema

### 2. Tool Classification

Tools are classified into two categories:

**Safe Auto-Execute Tools** (no user confirmation needed):

- `read_file`
- `list`
- `search`
- `grep_search`
- `get_errors`

**User Confirmation Required**:

- `create`
- `insert_edit_into_file`
- `bash`
- `run_in_terminal`
- All other tools

### 3. Execution Process

```typescript
// Auto-execute safe tools
if (SAFE_AUTO_TOOLS.has(toolCall.toolName)) {
    autoExecutedCalls.push(toolCall);
    try {
        const output = await runTool(
            {
                toolName: toolCall.toolName,
                args: toolCall.args || {},
            },
            config,
        );
        // Store result and continue
    } catch (error) {
        // Store error and continue
    }
}
```

## Tool Arguments Handling

### Critical: Args Extraction

After AI SDK 5 migration, tool arguments must be explicitly extracted:

```typescript
const validToolCalls = toolCalls
    .filter((call) => {
        if (!call.toolCallId || !call.toolName) {
            logger.warn(`Invalid tool call structure: ${JSON.stringify(call)}`);
            return false;
        }
        return true;
    })
    .map((call) => ({
        ...call,
        args: call.args || {}, // Ensure args always exists
    }));
```

### Conversion to Model Messages

When converting tool calls back to messages for the next step:

```typescript
case "tool-request": {
    return {
        role: "assistant",
        content: item.calls.map((call) => {
            const args = call.args || {};
            return {
                type: "tool-call" as const,
                toolCallId: call.toolCallId,
                toolName: call.toolName,
                args,
                input: args, // AI SDK 5 requires both
            };
        }),
    };
}
```

## Response Messages

### Adding to Conversation History

For multi-step scenarios, tool messages must be properly stored:

```typescript
// Tool result storage
{
    id: randomUUID(),
    role: "tool-result",
    toolCallId: toolCall.toolCallId,
    toolName: toolCall.toolName,
    output,
}

// Tool failure storage
{
    id: randomUUID(),
    role: "tool-failure",
    toolCallId: toolCall.toolCallId,
    toolName: toolCall.toolName,
    error: error.message,
}
```

## Tool Execution Options

### Available Context in Execute Function

Tools receive additional options as a second parameter:

```typescript
execute: async (args, options) => {
    const {
        toolCallId, // ID of this tool call
        messages, // Full conversation history
        abortSignal, // For cancellation
        experimental_context: context, // Custom context
    } = options;

    // Tool implementation
};
```

### Example: Using Tool Call ID

```typescript
export const createTool = tool({
    description: "Create a new file.",
    inputSchema: z.object({
        path: z.string(),
        content: z.string(),
    }),
    execute: async ({ path, content }, { toolCallId }) => {
        logger.info(`Executing create tool with ID: ${toolCallId}`);
        await fileTracker.write(path, content);
        return `Successfully created file at ${path}`;
    },
});
```

## Error Handling

### Tool Execution Errors

Binharic handles three types of tool-related errors:

1. **`NoSuchToolError`**: Tool doesn't exist
2. **`InvalidToolInputError`**: Args don't match schema
3. **`ToolError`** (custom): Execution failure

```typescript
try {
    await fileTracker.write(path, content);
    return `Successfully created file at ${path}`;
} catch (error: unknown) {
    if (error instanceof Error) {
        throw new ToolError(error.message);
    }
    throw new ToolError("An unknown error occurred.");
}
```

### Error Propagation

Tool errors are stored as `tool-failure` items and sent back to the LLM:

```typescript
{
    role: "tool",
    content: [{
        type: "tool-result",
        toolCallId: item.toolCallId,
        toolName: item.toolName,
        output: {
            type: "text",
            value: `Error: ${item.error}`,
        },
    }],
}
```

## Tool Choice Strategies

### Default Behavior

```typescript
toolChoice: "auto"; // Model decides when to use tools
```

### Force Tool Usage

```typescript
toolChoice: "required"; // Model must use a tool
```

### Disable Tools

```typescript
toolChoice: "none"; // Model cannot use tools
```

### Force Specific Tool

```typescript
toolChoice: {
    type: 'tool',
    toolName: 'specific_tool_name'
}
```

## Active Tools

Limit available tools per request:

```typescript
const agent = new Agent({
    model: llmProvider,
    tools: allToolsObject,
    activeTools: ["read_file", "list", "search"], // Only these available
    // ...
});
```

## Type Safety

### Tool Type Definitions

```typescript
import { TypedToolCall, TypedToolResult } from "ai";

type MyToolCall = TypedToolCall<typeof tools>;
type MyToolResult = TypedToolResult<typeof tools>;

// Use in function signatures
async function processToolCalls(calls: Array<MyToolCall>): Promise<Array<MyToolResult>> {
    // Implementation
}
```

## Tool Organization

### File Structure

```
src/agent/tools/
├── index.ts                    # Tool exports and runTool function
└── definitions/
    ├── index.ts                # Tool registry
    ├── create.ts               # Create file tool
    ├── edit.ts                 # Edit file tool
    ├── bash.ts                 # Bash execution tool
    ├── list.ts                 # List directory tool
    ├── readFile.ts            # Read file tool
    └── ...
```

### Tool Registry Pattern

```typescript
// src/agent/tools/definitions/index.ts
import { createTool } from "./create.js";
import { editTool } from "./edit.js";
// ... other imports

export const tools = {
    create: createTool,
    insert_edit_into_file: editTool,
    // ... other tools
} as const;
```

## Best Practices

### 1. Input Validation

Always validate inputs in the schema:

```typescript
inputSchema: z.object({
    path: z.string().min(1).describe("The path of the file"),
    content: z
        .string()
        .max(1024 * 1024)
        .describe("File content (max 1MB)"),
}).strict();
```

### 2. Descriptive Tool Documentation

Use clear descriptions to help the LLM choose correctly:

```typescript
description: "Create a new file with the specified content. " +
    "Use this when the user wants to create a new file, " +
    "not when modifying existing files.";
```

### 3. Error Messages

Provide clear, actionable error messages:

```typescript
if (!path || path.trim().length === 0) {
    throw new ToolError("File path cannot be empty. Please provide a valid path.");
}
```

### 4. Logging

Log tool execution for debugging:

```typescript
logger.info(`Executing ${toolName} with args:`, args);
logger.info(`Tool ${toolName} completed successfully`);
logger.error(`Tool ${toolName} failed:`, error);
```

## StreamText Integration

### Proper Result Handling

```typescript
// CORRECT: AI SDK 5 structure
const streamResult = await streamText({
    model: llmProvider,
    system: systemPrompt,
    messages: truncatedHistory,
    tools,
});

const textStream = streamResult.textStream;
const toolCallsPromise = streamResult.toolCalls;

// Process text stream
for await (const part of textStream) {
    // Handle text delta
}

// Wait for tool calls
const toolCalls = await toolCallsPromise;
```

## Troubleshooting

### Common Issues

1. **"File path cannot be empty"**
    - Cause: Tool args not properly extracted
    - Solution: Ensure `.map(call => ({ ...call, args: call.args || {} }))`

2. **"No tool call found for function call output"**
    - Cause: Tool call ID mismatch between request and response
    - Solution: Properly destructure streamText result

3. **Tool not executing**
    - Check if tool name matches registry
    - Verify input schema matches LLM output
    - Check logs for validation errors

## Testing Tools

### Unit Test Example

```typescript
describe("Create Tool", () => {
    it("should create a file with valid inputs", async () => {
        const result = await createTool.execute({
            path: "test.txt",
            content: "Hello World",
        });

        expect(result).toContain("Successfully created");
    });

    it("should throw error for empty path", async () => {
        await expect(
            createTool.execute({
                path: "",
                content: "test",
            }),
        ).rejects.toThrow("File path cannot be empty");
    });
});
```

## References

- [AI SDK Tool Calling Documentation](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling)
- [Multi-Step Tool Calls](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling#multi-step-calls)
- [Error Handling](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling#handling-errors)

## Last Updated

October 14, 2025
