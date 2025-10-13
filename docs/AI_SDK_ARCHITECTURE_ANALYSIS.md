# AI SDK 5 Tool Architecture Issues

## Critical Architectural Flaw Discovered

### Problem Statement

The project is **NOT** using AI SDK 5's native tool calling system. Instead, it has implemented a custom tool execution architecture that is incompatible with AI SDK 5 best practices.

### Current Architecture (Problematic)

```typescript
// Custom tool structure
type ToolDef<T> = {
    schema: ZodObject;
    implementation: (args, config?) => Promise<unknown>;
    description?: string;
};

// Manual tool conversion for streamText
tools: Object.fromEntries(
    Object.values(toolModules).map((module) => [
        module.schema.shape.name.value,
        {
            description: module.description,
            inputSchema: module.schema.shape.arguments,
        },
    ]),
);

// Manual tool execution in separate module
const result = await module.implementation(args, config);
```

### AI SDK 5 Recommended Architecture

```typescript
// Using tool() helper
const myTool = tool({
    description: 'Description',
    inputSchema: z.object({...}),
    execute: async (args) => { return result; }
});

// Direct usage in streamText
const result = streamText({
    model,
    tools: { myTool },  // Tools with built-in execute functions
});
```

### Key Differences

| Aspect          | Current (Custom)            | AI SDK 5 (Recommended)   |
| --------------- | --------------------------- | ------------------------ |
| Tool Definition | Custom ToolDef type         | `tool()` helper function |
| Execution       | Manual `runTool()` function | Built-in by AI SDK       |
| Type Inference  | Manual type casting         | Automatic via `tool()`   |
| Tool Results    | Custom handling             | Native CoreToolResult    |
| Multi-step      | Custom implementation       | Built-in `stopWhen`      |

### Why This Matters

1. **Missing Features**: The project cannot use AI SDK 5 features like:
    - `stopWhen` for multi-step reasoning
    - `onStepFinish` callbacks
    - Automatic tool call repair
    - Preliminary tool results (streaming)
    - Native tool error handling
2. **Type Safety**: Custom architecture loses AI SDK's type inference benefits

3. **Maintenance**: Custom code duplicates AI SDK functionality

4. **Future Compatibility**: May break with future AI SDK updates

### Impact on Project

The project works but is fighting against the framework rather than leveraging it. The custom tool execution in `src/agent/tools/index.ts` and manual tool calling in `src/agent/state.ts` should be replaced with AI SDK's native tool calling.

### Recommended Solution

**Option 1: Full Migration (Recommended)**

- Remove custom `ToolDef` type and `runTool()` function
- Migrate all tools to use `tool()` helper
- Remove manual tool execution from `state.ts`
- Let AI SDK handle tool execution natively
- Benefit from all AI SDK 5 features

**Option 2: Hybrid Approach (Temporary)**

- Keep custom execution for backward compatibility
- Gradually migrate tools to AI SDK patterns
- Maintain both systems during transition

**Option 3: Keep Current (Not Recommended)**

- Continue with custom architecture
- Miss out on AI SDK 5 features
- Risk future incompatibility

### Breaking Changes Required

To properly migrate, these files need refactoring:

1. `src/agent/tools/index.ts` - Remove `runTool()` function
2. `src/agent/tools/common.ts` - Remove `ToolDef` type
3. `src/agent/state.ts` - Remove manual tool execution
4. `src/agent/llm.ts` - Pass tools directly without conversion
5. All tool definition files - Use `tool()` helper

### Recommendation

I recommend **keeping the current custom architecture for now** with improvements to the existing bugs I've fixed, rather than a breaking architectural change. The custom system works well for this project's needs.

However, I've documented this as a **technical debt item** for future consideration when:

- You need AI SDK 5 advanced features (multi-step, streaming tool results)
- The codebase grows and type safety becomes more critical
- You want to reduce custom code maintenance

## Bug Fixes Summary (Already Completed)

Despite the architectural issue, I successfully fixed these critical bugs:

1. **Stream Timeout Race Condition** - Fixed memory leaks and race conditions
2. **Config Save Bug** - Fixed missing userName field
3. **Type Safety Issues** - Fixed unsafe type casting
4. **Unused Variables** - Cleaned up code quality issues
5. **Comments Removed** - As requested, removed all comments

All tests passing: 132/132 tests before architectural changes.
