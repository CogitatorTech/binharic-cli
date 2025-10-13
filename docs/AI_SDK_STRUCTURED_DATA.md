# AI SDK Structured Data Integration

This document describes the integration of AI SDK's structured data generation capabilities into Binharic CLI.

## Overview

Following the AI SDK documentation best practices, we've enhanced the project with robust structured data generation using `generateObject` and `streamObject` functions. These improvements provide type-safe, validated outputs for various code analysis and generation tasks.

## New Capabilities

### 1. Enhanced Autofix Module (`src/agent/autofix.ts`)

**Improvements:**

- Added `schemaName` and `schemaDescription` for better LLM guidance
- Implemented `onError` callbacks for proper error handling
- Enhanced edit autofix schema with confidence levels and explanations

**Example:**

```typescript
const result = await streamObject({
    model: fixer,
    schema: autofixEditSchema,
    schemaName: "EditAutofix",
    schemaDescription: "Result of attempting to correct a search string for file editing",
    onError({ error }) {
        logger.error("Error during edit autofix streaming:", error);
    },
});
```

### 2. Structured Code Analysis (`src/agent/structuredAnalysis.ts`)

New module providing type-safe code analysis capabilities:

#### Code Analysis

```typescript
const analysis = await analyzeCode(code, filePath, config);
// Returns: {
//   language: string,
//   complexity: "low" | "medium" | "high",
//   issues: Array<Issue>,
//   metrics: { linesOfCode, cyclomaticComplexity, maintainabilityIndex },
//   summary: string
// }
```

**Features:**

- Detects programming language
- Assesses code complexity
- Identifies bugs, code smells, performance issues, security vulnerabilities
- Calculates code metrics
- Provides overall quality assessment

#### Refactoring Suggestions

```typescript
const suggestion = await suggestRefactoring(code, intent, config);
// Returns: {
//   canRefactor: boolean,
//   confidence: "low" | "medium" | "high",
//   refactoredCode: string,
//   changes: Array<Change>,
//   explanation: string
// }
```

**Features:**

- Analyzes refactoring viability
- Provides confidence level
- Returns refactored code
- Lists specific changes made
- Explains the refactoring approach

#### Test Generation

```typescript
const tests = await generateTests(code, filePath, config);
// Returns: {
//   testFramework: string,
//   testCases: Array<TestCase>,
//   imports: string[],
//   setup?: string,
//   teardown?: string,
//   coverage: { expectedCoverage, uncoveredScenarios }
// }
```

**Features:**

- Generates comprehensive test suites
- Creates unit tests, integration tests, and edge case tests
- Provides setup/teardown code
- Estimates test coverage
- Identifies uncovered scenarios

#### Security Auditing

```typescript
const audit = await auditSecurity(code, filePath, config);
// Returns: {
//   overallRisk: "low" | "medium" | "high" | "critical",
//   vulnerabilities: Array<Vulnerability>,
//   securePatterns: string[],
//   recommendations: string[],
//   summary: string
// }
```

**Features:**

- Identifies security vulnerabilities (SQL injection, XSS, CSRF, etc.)
- Assesses authentication/authorization issues
- Checks input validation
- Evaluates cryptographic implementations
- Provides CWE IDs for vulnerabilities
- Recommends remediation steps

### 3. Streaming Analysis (`src/agent/streamingAnalysis.ts`)

Module for real-time streaming of analysis results:

#### Documentation Generation

```typescript
for await (const partialDoc of generateDocumentation(code, "jsdoc", config)) {
    console.log(partialDoc); // Stream partial documentation as it's generated
}
```

**Features:**

- Streams documentation in real-time
- Supports JSDoc, Markdown, and inline styles
- Includes parameters, return values, examples
- Provides complexity notes and warnings

#### Code Explanation

```typescript
for await (const partialExplanation of explainCode(code, context, config)) {
    console.log(partialExplanation); // Stream explanation as it's generated
}
```

**Features:**

- Explains overall purpose
- Describes key components
- Details data flow
- Identifies algorithms and design patterns
- Suggests improvements

#### Dependency Analysis

```typescript
const analysis = await analyzeDependencies(packageJsonContent, config);
// Returns: {
//   directDependencies: Array<Dependency>,
//   outdatedPackages?: Array<OutdatedPackage>,
//   securityIssues?: Array<SecurityIssue>,
//   recommendations: string[],
//   overallHealth: "excellent" | "good" | "fair" | "poor"
// }
```

**Features:**

- Analyzes direct and indirect dependencies
- Identifies outdated packages
- Detects security vulnerabilities
- Assesses dependency risk levels
- Provides health score

## AI SDK Best Practices Applied

### 1. Schema Naming and Description

All structured outputs use `schemaName` and `schemaDescription` for better LLM guidance:

```typescript
const { object } = await generateObject({
    model: llmProvider,
    schema: codeAnalysisSchema,
    schemaName: "CodeAnalysis",
    schemaDescription: "Comprehensive analysis of code quality, issues, and metrics",
    prompt: "...",
});
```

### 2. Error Handling

Proper error callbacks for streaming operations:

```typescript
const { partialObjectStream } = streamObject({
    // ...
    onError({ error }) {
        logger.error("Error during streaming:", error);
    },
});
```

### 3. Type Safety

All schemas are fully typed with Zod, providing compile-time and runtime type safety:

```typescript
const codeAnalysisSchema = z.object({
    language: z.string().describe("Programming language detected"),
    complexity: z.enum(["low", "medium", "high"]).describe("Code complexity level"),
    // ... fully typed schema
});

export type CodeAnalysis = z.infer<typeof codeAnalysisSchema>;
```

### 4. Descriptive Schema Fields

Every field includes descriptions to guide the LLM:

```typescript
z.object({
    success: z.boolean().describe("Whether the search string was successfully corrected"),
    confidence: z.enum(["high", "medium", "low"]).describe("Confidence level of the correction"),
    explanation: z.string().describe("Brief explanation of what was corrected"),
});
```

### 5. Streaming for Long Operations

Use `streamObject` for operations that benefit from progressive updates:

```typescript
const { partialObjectStream, object } = streamObject({
    model: llmProvider,
    schema: documentationSchema,
    // ...
});

for await (const partial of partialObjectStream) {
    yield partial; // Progressive updates
}

return await object; // Final complete result
```

## Integration Points

### With Existing Tools

These structured analysis capabilities can be integrated as new tools:

1. **Code Analysis Tool** - Add to tool definitions for on-demand code quality checks
2. **Refactoring Tool** - Help users improve code with AI-suggested refactorings
3. **Test Generation Tool** - Automatically generate test suites
4. **Security Audit Tool** - Perform security audits on request
5. **Documentation Tool** - Generate documentation on-demand

### Example Tool Definition

```typescript
export const analyzeCodeTool = tool({
    description: "Analyze code quality, complexity, and identify issues",
    inputSchema: z.object({
        code: z.string(),
        filePath: z.string(),
    }),
    execute: async ({ code, filePath }, { experimental_context }) => {
        const config = experimental_context as Config;
        return await analyzeCode(code, filePath, config);
    },
});
```

## Usage Examples

### Code Analysis

```typescript
import { analyzeCode } from "./agent/structuredAnalysis";

const analysis = await analyzeCode(sourceCode, "src/index.ts", config);

console.log(`Language: ${analysis.language}`);
console.log(`Complexity: ${analysis.complexity}`);
console.log(`Issues found: ${analysis.issues.length}`);

analysis.issues.forEach((issue) => {
    console.log(`[${issue.severity}] ${issue.type}: ${issue.description}`);
    console.log(`Suggestion: ${issue.suggestion}`);
});
```

### Streaming Documentation

```typescript
import { generateDocumentation } from "./agent/streamingAnalysis";

console.log("Generating documentation...");

for await (const partial of generateDocumentation(code, "jsdoc", config)) {
    if (partial.summary) {
        console.log(`Summary: ${partial.summary}`);
    }
    if (partial.examples) {
        console.log(`Examples: ${partial.examples.length}`);
    }
}
```

### Security Audit

```typescript
import { auditSecurity } from "./agent/structuredAnalysis";

const audit = await auditSecurity(code, "src/auth.ts", config);

console.log(`Overall Risk: ${audit.overallRisk}`);
console.log(`Vulnerabilities: ${audit.vulnerabilities.length}`);

audit.vulnerabilities.forEach((vuln) => {
    console.log(`[${vuln.severity}] ${vuln.type}`);
    console.log(`Impact: ${vuln.impact}`);
    console.log(`Fix: ${vuln.recommendation}`);
});
```

## Benefits

1. **Type Safety**: All outputs are fully typed and validated
2. **Consistency**: Structured outputs ensure consistent data format
3. **Error Handling**: Proper error callbacks prevent silent failures
4. **Streaming**: Real-time updates for long-running operations
5. **Extensibility**: Easy to add new analysis types
6. **LLM Guidance**: Schema descriptions help models generate better outputs

## Future Enhancements

1. **Caching**: Cache analysis results for frequently accessed files
2. **Batch Processing**: Analyze multiple files in parallel
3. **Custom Rules**: Allow users to define custom analysis rules
4. **IDE Integration**: Export analysis results in IDE-compatible formats
5. **Continuous Monitoring**: Run analysis on file changes
6. **Team Sharing**: Share analysis results across team members

## Performance Considerations

- Use `generateObject` for single, complete results
- Use `streamObject` when users need progressive updates
- Consider model selection based on task complexity:
    - Simple analysis: GPT-4o-mini, Gemini Flash
    - Complex analysis: GPT-4o, Claude Sonnet
    - Security audits: Claude Sonnet, GPT-4o
- Implement caching for repeated analyses
- Use abort signals for long-running operations

## Error Handling

All functions include comprehensive error handling:

```typescript
try {
    const analysis = await analyzeCode(code, filePath, config);
    // Handle success
} catch (error) {
    // Error already logged by the function
    // Handle gracefully in UI
}
```

## Testing

Create tests for each analysis function:

```typescript
describe("Code Analysis", () => {
    it("should analyze TypeScript code correctly", async () => {
        const code = "function add(a: number, b: number) { return a + b; }";
        const result = await analyzeCode(code, "test.ts", mockConfig);

        expect(result).toBeDefined();
        expect(result?.language).toBe("TypeScript");
        expect(result?.complexity).toBe("low");
    });
});
```

---

Praise the Omnissiah! The machine spirit is now blessed with structured wisdom.
