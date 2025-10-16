# Test Organization

## Overview

The test files in `tests/agent/` have been reorganized to mirror the source code structure in `src/agent/`, making it easier to find and maintain related tests.

## Directory Structure

### tests/agent/context/
Tests for context management and window handling:
- `contextWindow.test.ts` - Core context window functionality
- `contextWindowAccuracy.test.ts` - Context window accuracy tests
- `contextWindowEdgeCases.test.ts` - Edge cases for context windows
- `contextTokenOverhead.test.ts` - Token overhead calculations

### tests/agent/core/
Tests for core agent functionality:
- `agents.test.ts` - Main agent functionality
- `specializedAgents.test.ts` - Specialized agent types
- `checkpoints.test.ts` - Checkpoint system
- `state.test.ts` - State management
- `stateRaceCondition.test.ts` - State race condition handling
- `fileTracker.test.ts` - File tracking system
- `fileTrackerMemoryLeak.test.ts` - Memory leak prevention
- `fileTrackerObservability.test.ts` - Observability features
- `fileTrackerSymlinks.test.ts` - Symbolic link handling
- `configManagement.test.ts` - Configuration management
- `configValidation.test.ts` - Configuration validation
- `systemPromptValidation.test.ts` - System prompt validation
- `codeQualityFixes.test.ts` - Code quality improvements

### tests/agent/errors/
Tests for error handling:
- `errorHandling.test.ts` - Basic error handling
- `errorHandlingComprehensive.test.ts` - Comprehensive error scenarios
- `errorHierarchy.test.ts` - Error type hierarchy

### tests/agent/execution/
Tests for agent execution control:
- `loopControl.test.ts` - Loop control mechanisms
- `prepareStep.test.ts` - Preparation step execution
- `stoppingConditions.test.ts` - Stopping conditions
- `validation.test.ts` - Execution validation
- `validationSystem.test.ts` - Validation system
- `agentLockTimeout.test.ts` - Lock timeout handling
- `ctrlCInterrupt.test.ts` - Ctrl+C interrupt handling
- `escapeKeyCancelAgent.test.ts` - Escape key cancellation

### tests/agent/llm/
Tests for LLM providers and models:
- `llm.test.ts` - Core LLM functionality
- `modelRegistry.test.ts` - Model registry
- `providerAvailability.test.ts` - Provider availability checks
- `providerAvailabilityOllama.test.ts` - Ollama provider specific tests

### tests/agent/workflows/
Tests for workflow detection and execution:
- `workflows.test.ts` - Core workflow functionality
- `workflowDetector.test.ts` - Workflow detection
- `workflowBugFixes.test.ts` - Workflow bug fixes

### tests/agent/tools/
Tests for tool execution and security:
- `toolArgumentHandling.test.ts` - Tool argument handling
- `toolExecutionCancellation.test.ts` - Tool execution cancellation
- `safeToolAutoExecution.test.ts` - Safe automatic execution
- `fileSecurityValidation.test.ts` - File security validation
- `searchToolsSecurity.test.ts` - Search tool security
- `searchTimeoutLeak.test.ts` - Search timeout leak prevention

#### tests/agent/tools/definitions/
Tests for specific tool implementations:
- `bash.test.ts` - Bash command tool
- `create.test.ts` - File creation tool
- `edit.test.ts` - File editing tool
- `createToEditRewrite.test.ts` - Create-to-edit conversion
- `insertEditFuzzyMatch.test.ts` - Fuzzy matching for edits
- `insertEditSmartDiff.test.ts` - Smart diff for edits
- `readFile.test.ts` - File reading tool
- `list.test.ts` - Directory listing tool
- `search.test.ts` - File search tool
- `grepSearch.test.ts` - Grep search tool
- `fetch.test.ts` - HTTP fetch tool
- `gitTools.test.ts` - Git operations
- `inputValidation.test.ts` - Input validation
- `mcp.test.ts` - MCP integration
- `mcpIntegration.test.ts` - MCP integration tests
- `mcpResourceLeak.test.ts` - MCP resource leak prevention
- `terminalMemoryLeak.test.ts` - Terminal memory leak prevention
- `terminalSessionCleanup.test.ts` - Terminal session cleanup
- `terminalSessionRaceCondition.test.ts` - Terminal race conditions

### tests/agent/bugs/
Regression tests for fixed bugs:
- `anthropicAlignmentBugs.test.ts` - Anthropic alignment fixes
- `autofixTimeoutLeak.test.ts` - Autofix timeout leak
- `cliUndefinedVariableBug.test.ts` - CLI undefined variable fix
- `configSaveBug.test.ts` - Config save bug fix
- `configSaveCompleteBug.test.ts` - Config save completion fix
- `ctrlCInputAccessibilityBug.test.ts` - Ctrl+C accessibility fix
- `historyRollbackBug.test.ts` - History rollback fix
- `streamTimeoutBug.test.ts` - Stream timeout fix
- `toolCallIdMismatchBug.test.ts` - Tool call ID mismatch fix
- `typeSafetyBug.test.ts` - Type safety improvements

## Import Path Changes

All test files have been updated with corrected relative import paths:
- Tests in direct subdirectories use: `../../../src/`
- Tests in `tools/definitions/` use: `../../../../src/`

## Benefits

1. **Easier Navigation**: Tests are organized by functional area
2. **Better Maintainability**: Related tests are grouped together
3. **Mirrors Source Structure**: Test organization matches `src/agent/` structure
4. **Clear Separation**: Bug regression tests are separated from feature tests
5. **Scalability**: Easy to add new tests in appropriate locations

