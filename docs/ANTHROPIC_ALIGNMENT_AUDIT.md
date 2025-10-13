# Anthropic Agent Guidelines Alignment Audit

**Date:** October 14, 2025
**Project:** binharic-cli

## Executive Summary

This document analyzes binharic-cli against Anthropic's published agent guidelines and identifies architectural issues, bugs, and areas for improvement.

## Alignment Assessment

### Core Principles

#### 1. Simplicity ❌ VIOLATION

**Issue:** Multiple unused specialized agents creating unnecessary complexity

- `createCodeAnalysisAgent` - defined but never used
- `createSecurityAuditAgent` - defined but never used
- `createRefactoringAgent` - defined but never used
  **Fix:** Remove unused agents or integrate them properly into workflow system

#### 2. Transparency ⚠️ PARTIAL

**Issue:** Agent doesn't explain its plan before execution
**Current:** Agent immediately calls tools without stating approach
**Should:** Agent should first output its reasoning and plan
**Fix:** Modify system prompt to require planning phase

#### 3. Agent-Computer Interface (ACI) ✅ GOOD

**Strength:** Tool descriptions are comprehensive with examples and edge cases
**Issue:** Some tools don't follow poka-yoke principles

#### 4. Ground Truth Validation ❌ MISSING

**Issue:** Agent doesn't systematically verify tool results
**Current:** Tools execute but results aren't validated
**Should:** After file edits, agent should read back to confirm
**Fix:** Add validation step in agent loop

### Workflow Patterns

#### Prompt Chaining ⚠️ INCOMPLETE

**Status:** Basic sequential execution exists
**Issue:** No programmatic gates to verify intermediate steps

#### Routing ⚠️ PARTIALLY IMPLEMENTED

**Status:** `routeUserQuery` function exists but isn't used in main flow
**Issue:** All queries go through same agent regardless of complexity

#### Parallelization ❌ NOT IMPLEMENTED

**Issue:** Tools execute sequentially even when parallel execution is safe

#### Orchestrator-Workers ⚠️ HALF-IMPLEMENTED

**Status:** Workflow tool exists but orchestration is weak
**Issue:** Main agent doesn't dynamically break down tasks

#### Evaluator-Optimizer ❌ NOT IMPLEMENTED

**Issue:** No iterative refinement loop

### Agent Architecture

#### Stop Conditions ⚠️ TOO RESTRICTIVE

- Hard limit of 20 steps may prevent task completion
- Budget stop condition uses incorrect pricing
- Error threshold is too low (5 errors)

#### Loop Control ⚠️ ISSUES

- `createCompletionCondition` has weak detection logic
- No adaptive step count based on task complexity

#### Context Management ❌ BUGS

- `createAdaptiveSystemPrompt` is incomplete (cuts off mid-function)
- `combinePrepareSteps` may not compose correctly
- Tool result summarization truncates too aggressively (2000 chars)

#### Checkpoint System ⚠️ TOO AGGRESSIVE

**Issue:** All tools trigger confirmation prompts
**Should:** Only high-risk operations need human approval
**Fix:** Move safe tools (read, list, search) to auto-approve list

## Specific Bugs Identified

### Bug 1: Incomplete prepareStep.ts Function

**Location:** `src/agent/prepareStep.ts:createAdaptiveSystemPrompt`
**Issue:** Function body is cut off, incomplete implementation
**Severity:** HIGH

### Bug 2: Dead Code - Unused Agents

**Location:** `src/agent/agents.ts`
**Issue:** Three specialized agents defined but never instantiated
**Severity:** MEDIUM - Code maintenance burden

### Bug 3: Workflow Integration Missing

**Location:** `src/agent/workflows.ts`
**Issue:** `routeUserQuery` and `sequentialCodeGeneration` defined but not used
**Severity:** MEDIUM

### Bug 4: SAFE_AUTO_TOOLS Not Properly Used

**Location:** `src/agent/state.ts`
**Issue:** SAFE_AUTO_TOOLS constant defined but tool confirmation still required
**Severity:** MEDIUM - Poor UX

### Bug 5: Model Selection in Routing is Redundant

**Location:** `src/agent/workflows.ts:routeUserQuery`
**Issue:** `selectedModel = classification.complexity === "simple" ? model : model`
**Severity:** LOW - Logic bug, both branches identical

### Bug 6: Error Recovery Lacks Alternatives

**Location:** `src/agent/state.ts:_runAgentLogicInternal`
**Issue:** Consecutive error counter but no alternative strategy
**Severity:** MEDIUM

### Bug 7: Stop Condition Pricing Incorrect

**Location:** `src/agent/loopControl.ts:createBudgetStopCondition`
**Issue:** Hardcoded pricing doesn't match actual model costs
**Severity:** LOW

### Bug 8: Tool Result Validation Missing

**Location:** `src/agent/state.ts:confirmToolExecution`
**Issue:** Tools execute but results aren't verified for success
**Severity:** HIGH

## Recommendations

### Immediate Fixes

1. Complete `createAdaptiveSystemPrompt` function
2. Remove or properly integrate unused agents
3. Implement automatic approval for safe tools
4. Add ground truth validation after tool execution
5. Fix model selection logic in routing

### Architectural Improvements

1. Add transparent planning phase before execution
2. Implement proper workflow routing for different query types
3. Add iterative refinement for complex tasks
4. Increase step limits or make them adaptive
5. Improve error recovery with alternative approaches

### Best Practice Alignment

1. Follow Anthropic's recommendation: simplify before adding complexity
2. Implement checkpoints only for high-risk operations
3. Add validation steps to verify tool execution success
4. Make agent explain its reasoning before acting
5. Use workflows for well-defined tasks, agents for open-ended ones
