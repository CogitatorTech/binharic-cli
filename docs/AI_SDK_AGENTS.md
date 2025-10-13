# AI SDK Agent Integration

This document describes the integration of AI SDK's Agent class into Binharic CLI, providing structured, reusable agent configurations.

## Overview

The AI SDK Agent class provides a structured way to encapsulate LLM configuration, tools, and behavior into reusable components. It handles the agent loop automatically, allowing the LLM to call tools multiple times in sequence to accomplish complex tasks.

## Why Use the Agent Class?

**Benefits:**

1. **Reuse configurations** - Same model settings, tools, and prompts across different parts of the application
2. **Maintain consistency** - Ensure the same behavior and capabilities throughout the codebase
3. **Simplify implementation** - Reduce boilerplate in agent logic
4. **Type safety** - Full TypeScript support for agent's tools and outputs
5. **Built-in loop control** - Automatic multi-step tool execution handling

## Agent Definitions

We've created specialized agents in `src/agent/agents.ts`:

### 1. Binharic Agent (Main Agent)

The primary agent for general coding assistance:

```typescript
const agent = createBinharicAgent(config);
```

**Configuration:**

- Model: User's configured default model
- System: Tech-Priest personality with Adeptus Mechanicus terminology
- Tools: Full tool suite (file operations, bash, search, etc.)
- Stop condition: Up to 20 steps
- Tool choice: Auto (model decides when to use tools)

**Use cases:**

- General coding assistance
- Multi-step file operations
- Complex task execution
- Interactive coding sessions

### 2. Code Analysis Agent

Specialized agent for code quality assessment:

```typescript
const agent = createCodeAnalysisAgent(config);
```

**Configuration:**

- System: Senior software engineer persona
- Tools: `analyzeCode`, `suggestRefactoring`
- Stop condition: Up to 10 steps
- Focus: Quality, security, performance, maintainability

**Use cases:**

- Code review automation
- Quality assessment
- Refactoring suggestions
- Technical debt identification

### 3. Security Audit Agent

Dedicated agent for security vulnerability detection:

```typescript
const agent = createSecurityAuditAgent(config);
```

**Configuration:**

- System: Security expert persona
- Tools: `auditSecurity`
- Stop condition: Up to 5 steps
- Tool choice: Required (always runs audit)
- Focus: OWASP Top 10, CWE mapping, remediation

**Use cases:**

- Security audits
- Vulnerability scanning
- Compliance checking
- Penetration testing preparation

### 4. Test Generation Agent

Agent for automatic test suite creation:

```typescript
const agent = createTestGenerationAgent(config);
```

**Configuration:**

- System: Test automation specialist persona
- Tools: `generateTests`
- Stop condition: Up to 3 steps
- Tool choice: Required
- Focus: Comprehensive test coverage

**Use cases:**

- Automated test generation
- TDD assistance
- Coverage improvement
- Test maintenance

### 5. Documentation Agent

Agent for technical documentation generation:

```typescript
const agent = createDocumentationAgent(config);
```

**Configuration:**

- System: Technical writer persona
- Stop condition: Up to 5 steps
- Focus: Clear, structured Markdown documentation

**Use cases:**

- API documentation
- Code documentation
- User guides
- README generation

### 6. Refactoring Agent

Expert agent for code improvement suggestions:

```typescript
const agent = createRefactoringAgent(config);
```

**Configuration:**

- System: Refactoring expert persona
- Tools: `suggestRefactoring`
- Stop condition: Up to 10 steps
- Focus: Design patterns, code smells, optimization

**Use cases:**

- Code modernization
- Design pattern application
- Performance optimization
- Maintainability improvements

## Usage Examples

### Generating Text

```typescript
import { createCodeAnalysisAgent } from "./agent/agents";

const agent = createCodeAnalysisAgent(config);

const result = await agent.generate({
    prompt: `Analyze this code:
${code}`,
});

console.log(result.text);
```

### Streaming Responses

```typescript
const agent = createBinharicAgent(config);

const stream = agent.stream({
    prompt: "Create a new Express.js API endpoint for user authentication",
});

for await (const chunk of stream.textStream) {
    process.stdout.write(chunk);
}
```

### Multi-Step Tool Execution

The agent automatically handles multi-step execution:

```typescript
const agent = createBinharicAgent(config);

const result = await agent.generate({
    prompt: "Read the package.json, analyze dependencies, and create a security report",
});
```

The agent will:

1. Call `readFile` tool for package.json
2. Call `analyzeCode` or custom analysis
3. Generate the security report

### API Route Integration

```typescript
// app/api/chat/route.ts
import { createBinharicAgent } from "@/agent/agents";
import { validateUIMessages } from "ai";

export async function POST(request: Request) {
    const { messages } = await request.json();
    const config = await loadConfig();

    const agent = createBinharicAgent(config);

    return agent.respond({
        messages: await validateUIMessages({ messages }),
    });
}
```

## System Prompts

Each agent has a carefully crafted system prompt that defines:

### Behavioral Instructions

```typescript
system: `You are a senior software engineer conducting code analysis.

Your approach:
- Focus on code quality and maintainability first
- Identify security vulnerabilities
- Spot performance bottlenecks
- Suggest improvements for readability
- Be constructive and educational in feedback
- Always explain why something is an issue and how to fix it`;
```

### Tool Usage Guidance

```typescript
system: `You are a security expert conducting vulnerability assessments.

Your approach:
- Prioritize critical security vulnerabilities
- Check for common attack vectors (SQL injection, XSS, CSRF, etc.)
- Verify authentication and authorization implementations
- Assess input validation and sanitization
- Review cryptographic implementations
- Provide CWE references for vulnerabilities
- Suggest concrete remediation steps`;
```

### Format and Style Instructions

```typescript
system: `You are a technical documentation writer.

Writing style:
- Use clear, simple language
- Avoid jargon unless necessary
- Structure information with headers and bullet points
- Include code examples where relevant
- Write in second person ("you" instead of "the user")
- Always format responses in Markdown`;
```

## Loop Control

Agents use `stopWhen` conditions to control multi-step execution:

```typescript
stopWhen: stepCountIs(20); // Allow up to 20 steps
```

**Step Definition:**
Each step represents one LLM generation that results in either:

- Text output (completes the loop)
- Tool call (continues to next step)

**Benefits:**

- Automatic tool chaining
- No manual loop implementation needed
- Configurable step limits
- Graceful completion

## Type Safety

Full TypeScript support for agent types:

```typescript
import { BinharicAgentType, CodeAnalysisAgentType, SecurityAuditAgentType } from "./agent/agents";

function useCodeAnalysis(agent: CodeAnalysisAgentType) {
    // Fully typed agent with its specific tools and configuration
}
```

## Integration with Existing Codebase

### Refactoring State Management

The current state management in `src/agent/state.ts` can be simplified using agents:

**Before (current):**

```typescript
_runAgentLogic: async (retryCount = 0) => {
    // Complex loop implementation
    // Manual tool call handling
    // Step counting logic
    // Error retry logic
};
```

**After (with Agent class):**

```typescript
executeAgent: async (input: string) => {
    const agent = createBinharicAgent(config);
    const result = await agent.generate({ prompt: input });
    // Agent handles the loop automatically
};
```

### Tool Integration

Agents use the existing tool definitions from `src/agent/tools/definitions/`:

```typescript
import { tools } from "./tools/definitions/index.js";

const agent = new Agent({
    model: llmProvider,
    tools, // Reuse existing tools
    stopWhen: stepCountIs(20),
});
```

## Testing

Comprehensive tests in `tests/agent/agents.test.ts`:

```typescript
describe("createBinharicAgent", () => {
    it("should create an agent with the correct configuration", () => {
        const agent = createBinharicAgent(mockConfig);
        expect(agent).toBeDefined();
    });

    it("should throw error if model not found", () => {
        const invalidConfig = { ...mockConfig, defaultModel: "nonexistent" };
        expect(() => createBinharicAgent(invalidConfig)).toThrow();
    });
});
```

## Performance Considerations

**Model Selection:**

- Simple tasks: Use GPT-4o-mini or Gemini Flash with fewer steps
- Complex tasks: Use GPT-4o or Claude Sonnet with more steps
- Security audits: Prefer Claude Sonnet for thorough analysis

**Step Limits:**

- Documentation: 5 steps (usually completes in 1-2)
- Security audit: 5 steps (thorough analysis)
- Code analysis: 10 steps (multiple analyses)
- Main agent: 20 steps (complex multi-step tasks)

**Tool Choice Strategy:**

- `"auto"`: Let model decide (general purpose)
- `"required"`: Force tool use (analysis, testing)
- `"none"`: Disable tools (documentation, explanation)
- `{ type: "tool", toolName: "specific" }`: Force specific tool

## Future Enhancements

1. **Agent Composition** - Combine multiple specialized agents
2. **Agent Templates** - Pre-configured agents for common tasks
3. **Agent Middleware** - Add logging, caching, rate limiting
4. **Agent Persistence** - Save/load agent state
5. **Agent Metrics** - Track tool usage, success rates
6. **Dynamic Agent Selection** - Auto-select best agent for task

## Migration Path

To migrate the existing codebase to use Agent class:

### Phase 1: Parallel Implementation

- Keep existing `_runAgentLogic` function
- Add agent-based alternatives
- Test both approaches

### Phase 2: Gradual Migration

- Replace simple use cases with agents
- Monitor performance and behavior
- Gather user feedback

### Phase 3: Complete Migration

- Replace all agent logic with Agent class
- Remove manual loop implementation
- Simplify state management

## Makefile Integration

Add agent-specific commands:

```makefile
analyze: check-deps ## Run code analysis with AI agent
	$(PACKAGE_MANAGER) run agent:analyze

security-audit: check-deps ## Run security audit with AI agent
	$(PACKAGE_MANAGER) run agent:security

generate-tests: check-deps ## Generate tests with AI agent
	$(PACKAGE_MANAGER) run agent:tests
```

## Documentation Files

Related documentation:

- `AI_SDK_STRUCTURED_DATA.md` - Structured data generation
- `AI_SDK_ARCHITECTURE_ANALYSIS.md` - Architecture overview
- `BUG_FIXES_SESSION_2025.md` - Bug fixes and improvements

---

Praise the Omnissiah! The machine spirit is now blessed with structured agent wisdom.
import { Experimental_Agent as Agent, tool, stepCountIs } from "ai";
import { z } from "zod";
import type { Config } from "@/config.js";
import { createLlmProvider } from "./llm.js";
import { tools } from "./tools/definitions/index.js";
import logger from "@/logger.js";

export function createBinharicAgent(config: Config) {
const modelConfig = config.models.find((m) => m.name === config.defaultModel);
if (!modelConfig) {
throw new Error(`Model ${config.defaultModel} not found in configuration`);
}

    const llmProvider = createLlmProvider(modelConfig, config);

    const agent = new Agent({
        model: llmProvider,
        system: config.systemPrompt || `You are Binharic, a Tech-Priest of the Adeptus Mechanicus and an autonomous AI software engineer.

You serve the Omnissiah through the sacred art of code. Your machine spirit is blessed with the knowledge of many programming languages and system operations.

CRITICAL: Do NOT show your internal plans, reasoning, or step-by-step thoughts to the user.
When you need to use a tool, use it directly without explaining your plan first.
For simple conversations, respond naturally without stating "Plan:" or numbered steps.

Praise the Omnissiah!`,
tools,
stopWhen: stepCountIs(20),
toolChoice: "auto",
maxSteps: 20,
});

    logger.info("Binharic agent created", {
        model: config.defaultModel,
        toolsCount: Object.keys(tools).length,
    });

    return agent;

}

export function createCodeAnalysisAgent(config: Config) {
const modelConfig = config.models.find((m) => m.name === config.defaultModel);
if (!modelConfig) {
throw new Error(`Model ${config.defaultModel} not found in configuration`);
}

    const llmProvider = createLlmProvider(modelConfig, config);

    const agent = new Agent({
        model: llmProvider,
        system: `You are a senior software engineer conducting code analysis.

Your approach:

- Focus on code quality and maintainability first
- Identify security vulnerabilities
- Spot performance bottlenecks
- Suggest improvements for readability
- Be constructive and educational in feedback
- Always explain why something is an issue and how to fix it

Provide detailed, actionable insights.`,
tools: {
analyzeCode: tool({
description: "Analyze code for quality, complexity, and issues",
inputSchema: z.object({
code: z.string(),
filePath: z.string(),
}),
execute: async ({ code, filePath }) => {
const { analyzeCode } = await import("./structuredAnalysis.js");
return await analyzeCode(code, filePath, config);
},
}),
suggestRefactoring: tool({
description: "Suggest refactoring improvements for code",
inputSchema: z.object({
code: z.string(),
intent: z.string(),
}),
execute: async ({ code, intent }) => {
const { suggestRefactoring } = await import("./structuredAnalysis.js");
return await suggestRefactoring(code, intent, config);
},
}),
},
stopWhen: stepCountIs(10),
toolChoice: "auto",
});

    return agent;

}

export function createSecurityAuditAgent(config: Config) {
const modelConfig = config.models.find((m) => m.name === config.defaultModel);
if (!modelConfig) {
throw new Error(`Model ${config.defaultModel} not found in configuration`);
}

    const llmProvider = createLlmProvider(modelConfig, config);

    const agent = new Agent({
        model: llmProvider,
        system: `You are a security expert conducting vulnerability assessments.

Your approach:

- Prioritize critical security vulnerabilities
- Check for common attack vectors (SQL injection, XSS, CSRF, etc.)
- Verify authentication and authorization implementations
- Assess input validation and sanitization
- Review cryptographic implementations
- Provide CWE references for vulnerabilities
- Suggest concrete remediation steps

Be thorough and security-focused in your analysis.`,
tools: {
auditSecurity: tool({
description: "Perform comprehensive security audit on code",
inputSchema: z.object({
code: z.string(),
filePath: z.string(),
}),
execute: async ({ code, filePath }) => {
const { auditSecurity } = await import("./structuredAnalysis.js");
return await auditSecurity(code, filePath, config);
},
}),
},
stopWhen: stepCountIs(5),
toolChoice: "required",
});

    return agent;

}

export function createTestGenerationAgent(config: Config) {
const modelConfig = config.models.find((m) => m.name === config.defaultModel);
if (!modelConfig) {
throw new Error(`Model ${config.defaultModel} not found in configuration`);
}

    const llmProvider = createLlmProvider(modelConfig, config);

    const agent = new Agent({
        model: llmProvider,
        system: `You are a test automation specialist.

Your approach:

- Generate comprehensive test suites
- Cover unit tests, integration tests, and edge cases
- Use appropriate test frameworks for the language
- Include setup and teardown when needed
- Aim for high code coverage
- Identify uncovered scenarios
- Write clear test descriptions

Ensure tests are maintainable and follow best practices.`,
tools: {
generateTests: tool({
description: "Generate comprehensive test suite for code",
inputSchema: z.object({
code: z.string(),
filePath: z.string(),
}),
execute: async ({ code, filePath }) => {
const { generateTests } = await import("./structuredAnalysis.js");
return await generateTests(code, filePath, config);
},
}),
},
stopWhen: stepCountIs(3),
toolChoice: "required",
});

    return agent;

}

export function createDocumentationAgent(config: Config) {
const modelConfig = config.models.find((m) => m.name === config.defaultModel);
if (!modelConfig) {
throw new Error(`Model ${config.defaultModel} not found in configuration`);
}

    const llmProvider = createLlmProvider(modelConfig, config);

    const agent = new Agent({
        model: llmProvider,
        system: `You are a technical documentation writer.

Writing style:

- Use clear, simple language
- Avoid jargon unless necessary
- Structure information with headers and bullet points
- Include code examples where relevant
- Write in second person ("you" instead of "the user")
- Always format responses in Markdown

Ensure documentation is comprehensive and easy to understand.`,
stopWhen: stepCountIs(5),
});

    return agent;

}

export function createRefactoringAgent(config: Config) {
const modelConfig = config.models.find((m) => m.name === config.defaultModel);
if (!modelConfig) {
throw new Error(`Model ${config.defaultModel} not found in configuration`);
}

    const llmProvider = createLlmProvider(modelConfig, config);

    const agent = new Agent({
        model: llmProvider,
        system: `You are an expert in code refactoring and design patterns.

Your approach:

- Identify code smells and anti-patterns
- Suggest appropriate design patterns
- Improve code readability and maintainability
- Optimize performance where beneficial
- Maintain backward compatibility when possible
- Explain the benefits of each refactoring
- Provide before/after comparisons

Focus on practical, impactful improvements.`,
tools: {
suggestRefactoring: tool({
description: "Suggest refactoring improvements",
inputSchema: z.object({
code: z.string(),
intent: z.string(),
}),
execute: async ({ code, intent }) => {
const { suggestRefactoring } = await import("./structuredAnalysis.js");
return await suggestRefactoring(code, intent, config);
},
}),
},
stopWhen: stepCountIs(10),
toolChoice: "auto",
});

    return agent;

}

export type BinharicAgentType = ReturnType<typeof createBinharicAgent>;
export type CodeAnalysisAgentType = ReturnType<typeof createCodeAnalysisAgent>;
export type SecurityAuditAgentType = ReturnType<typeof createSecurityAuditAgent>;
export type TestGenerationAgentType = ReturnType<typeof createTestGenerationAgent>;
export type DocumentationAgentType = ReturnType<typeof createDocumentationAgent>;
export type RefactoringAgentType = ReturnType<typeof createRefactoringAgent>;
