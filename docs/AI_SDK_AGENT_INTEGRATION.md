# AI SDK Agent Integration

Date: January 13, 2025

## Overview

The binharic-cli project has been upgraded to use the AI SDK's `Experimental_Agent` class, providing a more robust and maintainable agent architecture with built-in agent loop functionality.

## What Changed

### Before: Manual Agent Implementation

Previously, the project used a custom agent implementation with manual loop control in `state.ts`:

- Manual tool call handling
- Custom retry logic
- Manual streaming management
- Complex state management with Zustand

### After: AI SDK Agent Class

Now using AI SDK's built-in Agent class with:

- **Automatic agent loop** - Handles tool calls and multiple steps automatically
- **Built-in stop conditions** - Uses `stepCountIs()` for loop control
- **Structured output support** - Native support for schema-based outputs
- **Type safety** - Full TypeScript support for tools and messages
- **Simplified code** - Reduced boilerplate and complexity

## Agent Types

The project now includes 6 specialized agent types:

### 1. General Agent (`createBinharicAgent`)

**Purpose**: Main conversational agent for general coding assistance

**Configuration**:

- All tools available
- 20 step limit
- Auto tool choice
- Dynamic system prompt from config

**Use case**: General purpose coding assistant, file operations, command execution

### 2. Code Analysis Agent (`createCodeAnalysisAgent`)

**Purpose**: Specialized for code quality analysis

**Tools**:

- `read_file` - Read source files
- `list` - List directory contents
- `search` - Search for files
- `grep_search` - Search file contents
- `get_errors` - Check for compilation errors

**Configuration**:

- 15 step limit
- Focus on code quality, maintainability, best practices

**Use case**: Code reviews, quality audits, identifying tech debt

### 3. Security Audit Agent (`createSecurityAuditAgent`)

**Purpose**: Identify security vulnerabilities

**Tools**:

- `read_file`, `list`, `search`, `grep_search`
- `bash` - Execute security scanning commands

**Configuration**:

- 20 step limit
- Tool choice: `required` - Always uses tools
- Focuses on security best practices

**Use case**: Security audits, vulnerability scanning, compliance checks

### 4. Refactoring Agent (`createRefactoringAgent`)

**Purpose**: Improve code structure and quality

**Tools**:

- `read_file`, `insert_edit_into_file`, `create`
- `get_errors` - Verify changes don't break code
- `run_in_terminal` - Run tests after refactoring

**Configuration**:

- 25 step limit (more steps for complex refactoring)
- Systematic, incremental approach

**Use case**: Code refactoring, technical debt reduction, pattern application

### 5. Test Generation Agent (`createTestGenerationAgent`)

**Purpose**: Create comprehensive test suites

**Tools**:

- `read_file`, `create`, `list`
- `run_in_terminal`, `get_terminal_output` - Run and verify tests

**Configuration**:

- 20 step limit
- Follows AAA pattern (Arrange, Act, Assert)

**Use case**: Test coverage improvement, TDD workflows

### 6. Documentation Agent (`createDocumentationAgent`)

**Purpose**: Generate technical documentation

**Tools**:

- `read_file`, `list`, `search`
- `insert_edit_into_file` - Update documentation

**Configuration**:

- 15 step limit
- Structured output using schema
- Focuses on clarity and examples

**Use case**: API documentation, README generation, inline comments

## Key Features

### Automatic Loop Control

```typescript
const agent = new Agent({
    model: llmProvider,
    tools,
    stopWhen: stepCountIs(20), // Automatic stop after 20 steps
});
```

The agent automatically:

1. Generates text or calls tools
2. Executes tools
3. Feeds results back to the model
4. Repeats until text generation or step limit

### Structured Output Support

```typescript
const agent = new Agent({
    model: llmProvider,
    experimental_output: Output.object({
        schema: documentationSchema,
    }),
});
```

Ensures consistent, type-safe outputs for specific use cases.

### Specialized System Prompts

Each agent type has a carefully crafted system prompt that:

- Defines clear objectives
- Sets behavioral guidelines
- Specifies focus areas
- Provides process instructions

### Tool Subsetting

Each agent only has access to relevant tools:

- Security agent: Can run bash commands for scanning
- Documentation agent: Cannot execute arbitrary code
- Test agent: Can run and verify tests

## Usage Examples

### Creating a General Agent

```typescript
import { createBinharicAgent } from "@/agent/agents";
import { loadConfig } from "@/config";

const config = await loadConfig();
const agent = await createBinharicAgent(config);

const result = await agent.generate({
    prompt: "Help me refactor this function",
});

console.log(result.text);
```

### Creating a Specialized Agent

```typescript
import { createAgentByType } from "@/agent/agents";

const securityAgent = await createAgentByType("security-audit", config);

const result = await securityAgent.generate({
    prompt: "Audit the authentication module for vulnerabilities",
});
```

### Streaming Responses

```typescript
const agent = await createBinharicAgent(config);

const stream = agent.stream({
    prompt: "Explain this code",
});

for await (const chunk of stream.textStream) {
    process.stdout.write(chunk);
}
```

## Benefits

### 1. Reduced Complexity

- **Before**: 500+ lines of manual agent loop logic
- **After**: AI SDK handles loop automatically

### 2. Better Error Handling

- Built-in retry mechanisms
- Graceful degradation
- Clear error messages

### 3. Easier Testing

- Mock the Agent class
- Test individual agent configurations
- Verify tool selection logic

### 4. Type Safety

- Full TypeScript support
- Type inference for messages and tools
- Compile-time checking

### 5. Maintainability

- Single responsibility per agent
- Clear separation of concerns
- Easy to add new agent types

## Migration Notes

### Breaking Changes

None for end users - the CLI interface remains the same.

### Internal Changes

- `agents.ts` now returns `Agent` instances instead of plain objects
- All agent creation is now async
- Tests updated to handle async agent creation

## Performance Impact

- **Minimal overhead**: AI SDK's Agent class is optimized
- **Better resource management**: Built-in step limits prevent runaway loops
- **Efficient streaming**: Native support for streaming responses

## Future Enhancements

1. **Custom Stop Conditions**: Implement domain-specific stop logic
2. **Agent Composition**: Combine multiple agents for complex workflows
3. **Persistent Agent State**: Save/restore agent sessions
4. **Agent Metrics**: Track performance and tool usage
5. **Multi-Agent Collaboration**: Agents working together on tasks

## References

- [AI SDK Agent Documentation](https://sdk.vercel.ai/docs/ai-sdk-core/agents)
- [AI SDK Loop Control](https://sdk.vercel.ai/docs/ai-sdk-core/loop-control)
- [AI SDK Structured Output](https://sdk.vercel.ai/docs/ai-sdk-core/structured-output)

## Testing

All agent types are tested in `tests/agent/agents.test.ts`:

- Agent creation
- Configuration validation
- Tool subsetting
- Error handling
- Type correctness

Run tests: `npm test tests/agent/agents.test.ts`
