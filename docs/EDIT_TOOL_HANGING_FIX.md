# Edit Tool Hanging Fix - October 14, 2025

## Problem

The `insert_edit_into_file` (edit) tool would hang indefinitely when:

1. User requested an edit (e.g., "add comments to it")
2. The LLM provided a `replace` edit action with incorrect search text
3. The autofix function was triggered to find the correct text
4. The `streamObject` API call would hang without timeout protection

### Symptoms

- UI shows "executing tool..." indefinitely
- No error messages
- Application becomes unresponsive
- User has to force quit with Ctrl+C

## Root Cause

The `autofixEdit` function in `src/agent/autofix.ts` was calling `streamObject` without any timeout protection:

```typescript
const { object } = await streamObject({
    model: fixer,
    prompt: fixEditPrompt(fileContent, incorrectSearch),
    schema: autofixEditSchema,
    // ... options
});

const result = await object; // Could hang forever
```

When the OpenAI API call took too long or stalled, there was no mechanism to abort it.

## Solution

### 1. Added Timeout Protection (10 seconds)

```typescript
const timeoutPromise = new Promise<null>((_, reject) => {
    setTimeout(() => reject(new Error("Autofix timeout after 10 seconds")), 10000);
});

const autofixPromise = (async () => {
    const result = await streamObject({
        /* ... */
    });
    return await result.object;
})();

const result = await Promise.race([autofixPromise, timeoutPromise]);
```

Now if autofix takes longer than 10 seconds, it will timeout and fail gracefully.

### 2. Made Autofix Optional

Added environment variable to disable autofix entirely:

```typescript
const shouldAttemptAutofix = process.env.OPENAI_API_KEY && process.env.ENABLE_EDIT_AUTOFIX !== "false";
```

**To disable autofix:**

```bash
export ENABLE_EDIT_AUTOFIX=false
```

### 3. Better Error Handling

Added try-catch around autofix call in the edit tool:

```typescript
if (shouldAttemptAutofix) {
    try {
        const correctedSearch = await autofixEdit(originalContent, edit.search);
        if (correctedSearch) {
            newContent = originalContent.replace(correctedSearch, edit.replaceWith);
            break;
        }
    } catch (autofixError) {
        logger.error("Autofix threw an error:", autofixError);
        // Fall through to error message
    }
}

// Autofix failed or disabled - provide helpful error
throw new ToolError(
    `The search string was not found in the file. ` +
        `Expected to find:\n"${edit.search.substring(0, 100)}..."\n\n` +
        `Tip: Use 'overwrite' or 'append' edit types instead.`,
);
```

### 4. Enhanced Logging

Added logging at key points to help diagnose issues:

- `logger.info("Attempting to autofix edit search string...")`
- `logger.warn("Autofix timed out")`
- `logger.info("Autofix successful, using corrected search string")`
- `logger.error("Autofix threw an error:", autofixError)`

## Files Modified

1. **src/agent/autofix.ts**
    - Added 10-second timeout to `autofixEdit` function
    - Added logging for debugging
    - Improved error handling

2. **src/agent/tools/definitions/edit.ts**
    - Made autofix optional via environment variable
    - Added try-catch for autofix errors
    - Improved error messages with helpful suggestions
    - Added truncation for long search strings in errors

## Testing

All 315 tests continue to pass after these changes.

## Usage Notes

### Normal Operation (Autofix Enabled)

1. Edit tool is called
2. If search text not found, autofix attempts to find it (max 10 seconds)
3. If autofix succeeds, edit proceeds
4. If autofix fails/times out, error is returned to LLM with suggestions

### Disabled Autofix

```bash
export ENABLE_EDIT_AUTOFIX=false
npm start
```

- Autofix is completely skipped
- Faster failure when search text is wrong
- LLM gets immediate feedback to try again

## Recommendations

### For Users

1. **If experiencing hanging**: Disable autofix with `ENABLE_EDIT_AUTOFIX=false`
2. **For simple edits**: Use `overwrite` instead of `replace` to avoid search issues
3. **For adding content**: Use `append` or `prepend` types

### For LLM

When the edit tool fails, the error message now provides:

- The search string that was attempted
- Suggestion to use different edit types
- Clear indication of what went wrong

## Alternative Edit Types

Instead of `replace` (which requires exact text match):

1. **`overwrite`**: Replace entire file content

    ```json
    {
        "type": "overwrite",
        "content": "new entire file content"
    }
    ```

2. **`append`**: Add to end of file

    ```json
    {
        "type": "append",
        "content": "\n// New comments"
    }
    ```

3. **`prepend`**: Add to beginning of file

    ```json
    {
        "type": "prepend",
        "content": "// File header\n"
    }
    ```

4. **`insert`**: Insert at specific line number
    ```json
    {
        "type": "insert",
        "line": 2,
        "content": "    // Comment on line 2"
    }
    ```

## Future Improvements

1. Consider using `insert` by default for adding comments (safer than `replace`)
2. Add retry logic with different edit strategies
3. Implement fuzzy matching for search strings without external API call
4. Cache autofix results to avoid repeated API calls

## Status

✅ **RESOLVED** - Edit tool no longer hangs

- Timeout protection implemented
- Graceful fallback on failure
- All tests passing

## Date

October 14, 2025
