# Tool Calling Fix - October 2025

## Problem Summary

After the AI SDK 5 migration, the application experienced critical failures when tools were called:

1. **Error**: `No tool call found for function call output with call_id call_xxx`
2. **Symptom**: Tool calls would work on first request, but subsequent requests after tool results would fail
3. **Impact**: Tools could not complete multi-step interactions, breaking the agent loop

## Root Cause Analysis

The issue was in how `streamText` results were being destructured and processed in `state.ts`:

### Issue 1: Incorrect Destructuring

```typescript
// BEFORE (incorrect)
const { textStream, toolCalls: toolCallPartsPromise } = await streamAssistantResponse(
    sdkCompliantHistory,
    config,
    systemPrompt,
);
```

The code was trying to destructure `textStream` and `toolCalls` directly, but AI SDK 5's `streamText` returns these as properties of a result object, not directly destructurable.

### Issue 2: Missing Input Property

When converting `tool-request` history items back to messages for the LLM, the code was initially missing the `input` property that AI SDK 5's `ToolCallPart` type requires.

## Solution

### Fix 1: Proper Result Handling

```typescript
// AFTER (correct)
const streamResult = await streamAssistantResponse(sdkCompliantHistory, config, systemPrompt);
const textStream = streamResult.textStream;
const toolCallsPromise = streamResult.toolCalls;
```

### Fix 2: Complete ToolCallPart Structure

```typescript
case "tool-request": {
    return {
        role: "assistant",
        content: item.calls.map((call) => {
            const args = (call as { args?: Record<string, unknown> }).args || {};
            return {
                type: "tool-call" as const,
                toolCallId: call.toolCallId,
                toolName: call.toolName,
                args,
                input: args,  // Required by AI SDK 5 ToolCallPart type
            };
        }),
    };
}
```

## Files Modified

- `src/agent/state.ts`: Fixed streamText result handling and tool-request conversion

## Test Results

All 315 tests passing after the fix:

- ✓ Tool call execution
- ✓ Multi-step tool interactions
- ✓ Tool result handling
- ✓ Error handling for tool failures

## UI Improvements Already in Place

The UI correctly hides:

- Tool call requests (not displayed to user)
- Successful tool results (only failures shown)
- Only shows final assistant responses and error messages

## Verification

The fix ensures:

1. ✅ Tool calls are properly extracted from streamText results
2. ✅ Tool results are correctly associated with their originating calls
3. ✅ Multi-step tool interactions work without errors
4. ✅ Command history continues to work correctly
5. ✅ All tests pass

## Date

October 14, 2025
