# Bug Analysis Report - Tobi Coding Agent

Generated: October 13, 2025

## Critical Issues

### 1. TypeScript Configuration Error

**Severity**: High
**Location**: tsconfig.spec.json
**Issue**: The rootDir is set to './src' but test files are in 'tests/', causing TypeScript compilation errors.
**Impact**: Type checking fails for all test files.
**Fix**: Remove rootDir from tsconfig.spec.json to allow both src and tests directories.

### 2. Model Configuration Issues

**Severity**: High
**Location**: src/config.ts (lines 73-100)
**Issue**: Default model names don't match actual API model IDs:

- "gpt-5-mini" doesn't exist (should be "gpt-4o-mini")
- "gpt-5", "gpt-5-nano" don't exist
- "claude-4-sonnet", "claude-4.5-sonnet" don't exist (should be "claude-3.5-sonnet")
- "gemini-2.5-pro", "gemini-2.5-flash" don't exist
  **Impact**: Application will fail when making API calls with non-existent model IDs.

### 3. Smart Edit Logic Flaw

**Severity**: Medium
**Location**: src/agent/tools/definitions/insertEditIntoFile.ts (line 70)
**Issue**: The applySmartEdit function has simplistic logic that can cause incorrect replacements. It only searches for the first few lines and does a simple string replace, which could match unintended locations.
**Impact**: File edits may be applied incorrectly, corrupting files.

### 4. Missing Error Handling

**Severity**: Medium
**Location**: src/config.ts (line 139)
**Issue**: Incomplete error handling - the else clause is truncated and doesn't handle all error cases.
**Impact**: Configuration loading errors may not be properly reported.

## Code Quality Issues

### 5. Excessive Comments in Code

**Severity**: Low
**Issue**: Many files contain inline comments that should be in documentation.
**Examples**:

- src/agent/state.ts: Line 2 "CORRECTED: Changed the tool output property..."
- src/agent/llm.ts: Line 2 "CORRECTED: Manually construct..."
- src/agent/fileTracker.ts: Line 2 "REFACTORED: Imports errors..."
  **Fix**: Remove inline comments and keep documentation in docs/.

### 6. Security Warning Comments

**Severity**: Medium
**Location**: src/agent/tools/definitions/bash.ts (lines 1-3)
**Issue**: Security warning is in comments rather than runtime checks or documentation.
**Fix**: Move to documentation and add runtime safeguards.

### 7. TSLint Disable Comments

**Severity**: Low
**Location**: src/logger.ts (lines 42-43)
**Issue**: Using @ts-ignore instead of proper typing.
**Fix**: Use proper TypeScript typing instead of suppressing errors.

### 8. Incomplete Config Loading

**Severity**: Medium
**Location**: src/config.ts
**Issue**: The error handling block is incomplete (ends abruptly at line 139).
**Impact**: May not handle all config loading error scenarios.

## Potential Runtime Issues

### 9. Race Condition Protection

**Severity**: Low
**Location**: src/agent/state.ts (line 216)
**Issue**: Race condition check exists but could be improved with proper locking.
**Status**: Currently has a check, but note for future improvement.

### 10. Context Window Token Counting

**Severity**: Low
**Location**: src/agent/contextWindow.ts
**Issue**: Uses gpt-tokenizer for all models, but different providers have different tokenization.
**Impact**: Token counts may be inaccurate for non-OpenAI models.

### 11. Git Repository Assumption

**Severity**: Low
**Location**: src/agent/state.ts (line 90)
**Issue**: Warning is logged but could be more graceful.
**Status**: Already handled with fallback to "unknown".

## Recommendations

1. Fix TypeScript configuration immediately
2. Update model configurations to use real API model IDs
3. Improve smart edit algorithm with better context matching
4. Complete error handling in config.ts
5. Move all explanatory comments to documentation
6. Add runtime security checks for bash tool
7. Use proper TypeScript types instead of @ts-ignore
8. Consider model-specific tokenizers for accurate context window management
