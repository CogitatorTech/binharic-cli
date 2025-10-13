# Bug Fix: Tool Call ID Mismatch

## Issue

The application was crashing with the error:

```
APICallError [AI_APICallError]: No tool call found for function call output with call_id call_88XXymx0qCzNTNNB8b8Ntncy.
```

## Root Cause

When tool calls were received from the LLM, the system was not properly converting the internal history format to the AI SDK's expected `ModelMessage` format. Specifically:

1. **Missing tool-call messages**: Tool requests were being stored in history but not converted to proper assistant messages with tool-call content
2. **Incorrect property names**: The AI SDK requires `input` property for ToolCallPart, not just `args`
3. **Wrong output structure**: Tool results need to be wrapped in `{ type: "text", value: string }` structure
4. **History ordering issue**: Tool request items were being added to history but not properly converted when building the next request

## Files Modified

- `src/agent/state.ts`

## Changes Made

### 1. Fixed tool-request to assistant message conversion

**Before:**

```typescript
case "tool-request": {
    const assistantToolCallMessage: HistoryItem = {
        id: randomUUID(),
        role: "assistant",
        content: toolCalls as unknown as string,
    } as HistoryItem;
    set((state) => ({ history: [...state.history, assistantToolCallMessage] }));
}
```

**After:**

```typescript
case "tool-request": {
    return {
        role: "assistant",
        content: item.calls.map((call) => ({
            type: "tool-call" as const,
            toolCallId: call.toolCallId,
            toolName: call.toolName,
            args: (call as { args?: Record<string, unknown> }).args || {},
            input: (call as { args?: Record<string, unknown> }).args || {},
        })),
    };
}
```

### 2. Fixed tool-result output structure

**Before:**

```typescript
return {
    role: "tool",
    content: [
        {
            type: "tool-result",
            toolCallId: item.toolCallId,
            toolName: item.toolName,
            output: {
                type: "text",
                value: outputText || "Tool executed successfully with no output.",
            },
        },
    ],
};
```

**After:**

```typescript
return {
    role: "tool",
    content: [
        {
            type: "tool-result" as const,
            toolCallId: item.toolCallId,
            toolName: item.toolName,
            output: {
                type: "text" as const,
                value: outputText || "Tool executed successfully with no output.",
            },
        },
    ],
};
```

### 3. Added tool call validation

```typescript
const validToolCalls = toolCalls.filter((call) => {
    if (!call.toolCallId || !call.toolName) {
        logger.warn(`Invalid tool call structure: ${JSON.stringify(call)}`);
        return false;
    }
    return true;
});

if (validToolCalls.length === 0) {
    logger.warn("No valid tool calls found, continuing as idle");
    set({ status: "idle" });
    return;
}
```

### 4. Fixed history ordering

Tool request items and auto-executed tool results are now properly ordered:

```typescript
if (pendingCalls.length > 0) {
    const toolRequestItem: ToolRequestItem = {
        id: randomUUID(),
        role: "tool-request",
        calls: pendingCalls,
    };
    set((state) => ({
        history:
            autoResults.length > 0
                ? [...state.history, toolRequestItem, ...autoResults]
                : [...state.history, toolRequestItem],
        pendingToolRequest: toolRequestItem,
        status: "tool-request",
    }));
}
```

## Testing

A comprehensive test suite has been added in `tests/agent/toolCallIdMismatchBug.test.ts` covering:

1. Tool-request to assistant message conversion
2. Tool-result output structure validation
3. Tool-failure error handling
4. Tool call ID consistency across request and result
5. Multiple tool calls with different IDs
6. Tool call structure validation

## Impact

This fix ensures that:

- Tool calls from the LLM are properly tracked through the conversation
- Tool results are correctly matched with their corresponding tool calls
- The AI SDK can properly reconstruct the conversation history
- The agent can execute multiple tool calls in sequence without errors

## Related Issues

- Fixes the "No tool call found for function call output" error
- Improves robustness of tool execution flow
- Ensures compatibility with AI SDK v5.x
