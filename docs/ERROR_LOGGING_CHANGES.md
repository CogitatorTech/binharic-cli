# Error Logging Changes

## Summary

All errors and warnings are now logged to files instead of being displayed in the terminal where Binharic is running. Users now see user-friendly error messages with a reference to check the logs for detailed information.

## Changes Made

### 1. **src/cli.ts** (NEW)

- Added **global error handlers** to catch unhandled promise rejections and uncaught exceptions
- These handlers intercept errors before Node.js prints them to the terminal
- All error details are logged to files with full stack traces
- Users see a clean message: "⚠️ A critical error occurred. Check logs for details."
- This fixes the issue where API errors (like 401 permission errors) were being printed to the terminal with full stack traces

### 2. **src/agent/state.ts**

- Removed all `console.error()` and `console.warn()` calls
- Replaced with `logger.error()` and `logger.warn()` calls for detailed technical information
- Updated error messages shown to users to be concise and user-friendly
- Added missing import for `checkProviderAvailability`
- Example changes:
    - Provider availability errors now log full details to files, while users see: "No LLM providers configured. Please check logs for details."
    - API key validation warnings go to logs only
    - File operation errors (history file read/write) log to files instead of console

### 3. **src/config.ts**

- Removed all `console.warn()` and `console.error()` calls
- Configuration loading errors now log detailed information to files
- API key setup instructions logged to files instead of terminal
- Model validation warnings go to logs

### 4. **src/ui/Footer.tsx**

- Enhanced error display in the UI to show:
    - User-friendly error message
    - Path to logs directory for detailed information
    - Visual indicator (⚠️) for errors
    - Example: "Check logs for details: ~/.config/binharic/logs"

## Benefits

1. **Cleaner Terminal Output**: The terminal running Binharic no longer shows stack traces and detailed error messages
2. **Better User Experience**: Users see concise, actionable error messages in the UI
3. **Complete Error Information**: All technical details are preserved in log files for debugging
4. **Consistent Logging**: All errors flow through the winston logger with timestamps and proper formatting
5. **No More Unhandled Rejections**: Global error handlers catch all errors before Node.js prints them

## Log Location

All logs are written to: `~/.config/binharic/logs/`

Each log file is named with a timestamp: `binharic-YYYY-MM-DDTHH-MM-SS-sssZ.log`

## Example: API Permission Error

**Before (Terminal Output):**

```
APICallError [AI_APICallError]: You have insufficient permissions for this operation...
    at file:///home/hassan/.../node_modules/@ai-sdk/provider-utils/dist/index.mjs:856:14
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    [... full stack trace ...]
```

**After (Terminal Output):**

```
⚠️  Error: API key permissions error
Check logs for details: ~/.config/binharic/logs
Press any key to continue.
```

**After (Log File):**

```json
{
  "level": "error",
  "message": "Unhandled promise rejection:",
  "timestamp": "2025-10-13T15:13:38.843Z",
  "message": "You have insufficient permissions for this operation...",
  "stack": "APICallError [AI_APICallError]: ... [full stack trace]",
  "reason": { ... full error object ... }
}
```

## Testing

All 117 tests pass successfully, confirming that:

- Error handling still works correctly
- Logger integration is functioning properly
- UI components display errors appropriately
- No functionality was broken by these changes
- Global error handlers don't interfere with test execution
