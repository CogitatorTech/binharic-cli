# Bug Fixes - October 14, 2025

## Critical Bugs Fixed

### 1. Memory Leak in Terminal Sessions

**Issue**: Terminal sessions were not properly cleaned up, causing memory leaks and zombie processes.

**Root Cause**:

- Event listeners were not removed when sessions ended
- No cleanup on application exit
- Missing hasResolved flag led to multiple resolve/reject calls

**Fix**:

- Added `cleanupSession()` function to properly remove all event listeners
- Added `cleanupAllSessions()` export for application-level cleanup
- Added hasResolved flag to prevent race conditions in promise resolution
- Integrated cleanup in CLI exit handlers (SIGINT, SIGTERM, uncaughtException)

**Files Modified**:

- `src/agent/tools/definitions/terminalSession.ts`
- `src/cli.ts`

**Tests**: `tests/agent/terminalSessionRaceCondition.test.ts`

---

### 2. Race Condition in State Management

**Issue**: Multiple concurrent calls to `_runAgentLogic` could execute simultaneously, causing state corruption.

**Root Cause**:

- No mutex/lock mechanism to prevent concurrent execution
- `startAgent` didn't check if agent was already running
- Tool execution confirmation could trigger multiple concurrent runs

**Fix**:

- Added `isAgentRunning` flag as a mutex lock
- Wrapped agent logic in try-finally to ensure lock is always released
- Added early return checks in `startAgent` and `confirmToolExecution`
- Extracted logic to separate `_runAgentLogicInternal` function for cleaner lock management

**Files Modified**:

- `src/agent/state.ts`

**Tests**: `tests/agent/stateRaceCondition.test.ts`

---

### 3. File Tracker Security Issues

**Issue**: File tracker didn't validate symbolic links or special files, could access directories.

**Root Cause**:

- No validation for file type before operations
- Symbolic links were followed without logging
- No protection against directory access

**Fix**:

- Added `validateFilePath()` method to check file types
- Added logging for symbolic link access
- Reject directory operations with clear error messages
- Use `fs.lstat()` to detect symbolic links before following them

**Files Modified**:

- `src/agent/fileTracker.ts`

**Tests**: `tests/agent/fileTrackerSymlinks.test.ts`

---

## Architectural Improvements

### 1. Better Error Boundaries

- Terminal session now has proper error handling with hasResolved flag
- State management has proper lock release in finally blocks
- File operations validate inputs before execution

### 2. Resource Management

- Terminal sessions auto-cleanup after 5 minutes
- File tracker enforces 1000 file limit
- All event listeners properly removed on cleanup

### 3. Concurrency Safety

- Mutex lock prevents race conditions in agent execution
- Status checks prevent duplicate operations
- Promise resolution protected from multiple calls

---

## Testing Coverage

All bugs have comprehensive test coverage:

- `fileTrackerSymlinks.test.ts` - 5 tests for file tracker edge cases
- `terminalSessionRaceCondition.test.ts` - 7 tests for terminal session issues
- `stateRaceCondition.test.ts` - 4 tests for state management race conditions

Total: 16 new tests added

---

## Migration Notes

No breaking changes - all fixes are backward compatible.

## Performance Impact

- Slight improvement due to proper cleanup reducing memory usage
- No performance degradation from mutex lock (already sequential operations)
