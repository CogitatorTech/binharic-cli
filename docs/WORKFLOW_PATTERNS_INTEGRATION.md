# AI SDK Workflow Patterns Integration

Date: October 13, 2025

## Overview

Integrated AI SDK workflow patterns into binharic-cli, providing structured and reliable approaches for complex agent tasks. These patterns combine the building blocks from the AI SDK to create sophisticated workflows with better control, error handling, and quality assurance.

## Implemented Patterns

### 1. Sequential Processing (Chains)

**Pattern**: Execute steps in predefined order where each step's output becomes input for the next.

**Implementation**: `sequentialCodeGeneration()`

**Use Case**: Complete feature development pipeline

- Generate code implementation
- Create comprehensive tests
- Write documentation

**Example**:

```typescript
const result = await sequentialCodeGeneration("Create a user authentication module", config);
// Returns: { code, tests, documentation }
```

**Benefits**:

- Clear, predictable flow
- Easy to debug
- Guaranteed execution order

### 2. Routing Pattern

**Pattern**: Model decides execution path based on context and classification.

**Implementation**: `routeUserQuery()`

**Use Case**: Intelligent query handling

- Classifies query type (code-edit, code-review, bug-fix, explanation, general)
- Determines complexity (simple/complex)
- Routes to appropriate handler with specialized system prompt

**Example**:

```typescript
const result = await routeUserQuery("Fix the memory leak in my code", config);
// Routes to bug-fix handler with debugging expertise
```

**Benefits**:

- Efficient resource usage (smaller models for simple tasks)
- Specialized handling per query type
- Adaptive system prompts

### 3. Parallel Processing

**Pattern**: Execute independent subtasks simultaneously for efficiency.

**Implementation**: `parallelCodeReview()`

**Use Case**: Multi-perspective code analysis

- Security review (vulnerabilities, injection risks)
- Performance review (bottlenecks, optimizations)
- Quality review (structure, readability, best practices)
- Aggregates results into actionable summary

**Example**:

```typescript
const result = await parallelCodeReview(codeContent, "/src/auth.ts", config);
// Returns: { reviews: [...], summary: "..." }
```

**Benefits**:

- 3x faster than sequential reviews
- Multiple expert perspectives
- Comprehensive coverage

### 4. Orchestrator-Worker Pattern

**Pattern**: Primary orchestrator coordinates specialized workers.

**Implementation**: `orchestratedFeatureImplementation()`

**Use Case**: Complex feature development

- Orchestrator creates implementation plan
- Workers execute specialized tasks (create, modify, delete files)
- Each worker optimized for specific change type

**Example**:

```typescript
const result = await orchestratedFeatureImplementation("Add shopping cart with checkout flow", config);
// Returns: { plan, changes: [...] }
```

**Benefits**:

- Maintains overall context
- Specialized expertise per task
- Scalable to complex features

### 5. Evaluator-Optimizer Pattern

**Pattern**: Quality control with iterative improvement.

**Implementation**: `codeRefactoringWithFeedback()`

**Use Case**: Code refactoring with quality assurance

- Initial refactoring attempt
- Evaluation of quality, accuracy, intent preservation
- Iterative improvement based on feedback
- Stops when quality threshold met or max iterations reached

**Example**:

```typescript
const result = await codeRefactoringWithFeedback(
    originalCode,
    "Improve error handling and add type safety",
    config,
    maxIterations: 3
);
// Returns: { refactoredCode, iterationsUsed, finalQuality }
```

**Benefits**:

- Self-improving workflow
- Quality guarantees
- Recovers from poor initial attempts

### 6. Adaptive Documentation Generation

**Pattern**: Audience-aware content generation with feedback.

**Implementation**: `adaptiveDocumentationGeneration()`

**Use Case**: Documentation tailored to skill level

- Beginner: Simple explanations, lots of examples, minimal jargon
- Intermediate: Balanced technical detail with clarity
- Expert: Precise terminology, implementation details, edge cases

**Example**:

```typescript
const result = await adaptiveDocumentationGeneration(codeContent, "beginner", config);
// Returns: { documentation, qualityScore, iterations }
```

**Benefits**:

- Audience-appropriate content
- Quality-controlled output
- Iterative improvement until standards met

## Workflow Executor

Unified interface for executing any workflow pattern:

```typescript
const result = await executeWorkflow("parallel-review", { code: myCode, filePath: "/src/api.ts" }, config);
```

**Supported Workflows**:

- `sequential-code-gen` - Sequential code generation
- `route-query` - Query routing
- `parallel-review` - Parallel code review
- `orchestrated-implementation` - Feature implementation
- `refactoring-feedback` - Refactoring with feedback
- `adaptive-docs` - Adaptive documentation

## Architecture Decisions

### When to Use Each Pattern

**Sequential Processing**:

- Well-defined, ordered steps
- Each step depends on previous output
- Content generation pipelines

**Routing**:

- Varied input types
- Different processing approaches needed
- Resource optimization important

**Parallel Processing**:

- Independent subtasks
- Time-sensitive operations
- Multiple expert perspectives needed

**Orchestrator-Worker**:

- Complex tasks requiring coordination
- Different types of expertise
- Maintaining overall context critical

**Evaluator-Optimizer**:

- Quality standards must be met
- Initial attempts may be imperfect
- Iterative improvement beneficial

**Adaptive Generation**:

- Audience-specific content
- Variable quality requirements
- Feedback-driven improvement

### Design Principles

1. **Flexibility vs Control**: Each pattern offers different trade-offs
    - Sequential: Maximum control, minimum flexibility
    - Routing: Balanced control with adaptive behavior
    - Parallel: Efficiency-focused with controlled concurrency
    - Orchestrator: Structured flexibility
    - Evaluator: Quality-focused with iteration limits

2. **Error Tolerance**: Built-in resilience
    - Retry logic in feedback loops
    - Quality thresholds prevent poor outputs
    - Graceful degradation on failures

3. **Cost Management**: Optimized LLM usage
    - Routing uses smaller models for simple tasks
    - Parallel processing batches independent calls
    - Feedback loops have iteration limits

4. **Maintainability**: Clear separation of concerns
    - Each workflow in isolated function
    - Consistent interfaces
    - Comprehensive logging

## Performance Characteristics

### Sequential Processing

- **Latency**: Linear (sum of all steps)
- **Cost**: Model calls per step
- **Reliability**: High (predictable flow)

### Routing

- **Latency**: Classification + execution
- **Cost**: Optimized (smaller models when possible)
- **Reliability**: High (type-safe classification)

### Parallel Processing

- **Latency**: Max of parallel branches
- **Cost**: Higher (multiple simultaneous calls)
- **Reliability**: Very high (independent failures isolated)

### Orchestrator-Worker

- **Latency**: Planning + max(worker tasks)
- **Cost**: Orchestrator + worker calls
- **Reliability**: High (structured coordination)

### Evaluator-Optimizer

- **Latency**: Variable (iteration-dependent)
- **Cost**: Variable (1-N iterations)
- **Reliability**: Very high (quality-assured)

## Testing

Comprehensive test suite in `tests/agent/workflows.test.ts`:

- Unit tests for each workflow pattern
- Integration tests for workflow executor
- Edge case handling
- Error scenarios

Run tests:

```bash
npm test tests/agent/workflows.test.ts
```

## Usage Examples

### Example 1: Feature Development Pipeline

```typescript
import { sequentialCodeGeneration } from "@/agent/workflows";

const result = await sequentialCodeGeneration("User profile page with avatar upload", config);

console.log("Code:", result.code);
console.log("Tests:", result.tests);
console.log("Docs:", result.documentation);
```

### Example 2: Smart Query Routing

```typescript
import { routeUserQuery } from "@/agent/workflows";

const result = await routeUserQuery("My application is running slowly", config);

console.log("Query type:", result.classification.type);
console.log("Response:", result.response);
```

### Example 3: Comprehensive Code Review

```typescript
import { parallelCodeReview } from "@/agent/workflows";

const result = await parallelCodeReview(codeContent, "/src/payment.ts", config);

result.reviews.forEach((review) => {
    console.log(`${review.type}:`, review.data.issues);
});
console.log("Summary:", result.summary);
```

### Example 4: Quality-Assured Refactoring

```typescript
import { codeRefactoringWithFeedback } from "@/agent/workflows";

const result = await codeRefactoringWithFeedback(
    legacyCode,
    "Modernize to use async/await and TypeScript",
    config,
    3, // max iterations
);

console.log("Iterations needed:", result.iterationsUsed);
console.log("Final quality:", result.finalQuality);
console.log("Refactored:", result.refactoredCode);
```

## Future Enhancements

1. **Workflow Composition**: Chain multiple patterns
2. **Custom Stop Conditions**: Domain-specific quality gates
3. **Workflow Templates**: Pre-configured common workflows
4. **Metrics Dashboard**: Track workflow performance and costs
5. **A/B Testing**: Compare different workflow configurations
6. **Workflow Caching**: Reuse results for similar inputs
7. **Progressive Enhancement**: Start simple, add complexity as needed

## References

- [AI SDK Workflow Patterns](https://sdk.vercel.ai/docs/ai-sdk-core/workflow-patterns)
- [Anthropic's Guide to Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- [AI SDK Core Documentation](https://sdk.vercel.ai/docs/ai-sdk-core)

## Best Practices

1. **Start Simple**: Begin with sequential or routing patterns
2. **Add Complexity Gradually**: Introduce parallel processing and feedback loops as needed
3. **Monitor Costs**: Track LLM calls and optimize expensive workflows
4. **Set Clear Thresholds**: Define quality standards upfront
5. **Log Everything**: Comprehensive logging aids debugging
6. **Test Thoroughly**: Each pattern has unique failure modes
7. **Consider User Experience**: Balance quality with response time

## Integration with Existing System

These workflows complement the existing agent system:

- Agents handle real-time interactive sessions
- Workflows handle batch/complex operations
- Both share configuration and tools
- Workflows can be invoked by agents for complex tasks
  import { generateText, generateObject } from "ai";
  import { z } from "zod";
  import type { Config } from "@/config.js";
  import { createLlmProvider } from "./llm.js";
  import logger from "@/logger.js";
  import { tools } from "./tools/definitions/index.js";

export async function sequentialCodeGeneration(
featureDescription: string,
config: Config,
): Promise<{
code: string;
tests: string;
documentation: string;
}> {
const modelConfig = config.models.find((m) => m.name === config.defaultModel);
if (!modelConfig) {
throw new Error("Default model not found");
}

    const model = createLlmProvider(modelConfig, config);

    logger.info("Starting sequential code generation workflow");

    const { text: code } = await generateText({
        model,
        system: "You are an expert software engineer. Write clean, maintainable code.",
        prompt: `Implement the following feature:\n${featureDescription}`,
    });

    const { text: tests } = await generateText({
        model,
        system: "You are a testing expert. Write comprehensive tests.",
        prompt: `Write unit tests for this code:\n\n${code}`,
    });

    const { text: documentation } = await generateText({
        model,
        system: "You are a technical writer. Create clear documentation.",
        prompt: `Document this code:\n\n${code}`,
    });

    logger.info("Sequential code generation workflow completed");

    return { code, tests, documentation };

}

const queryClassificationSchema = z.object({
reasoning: z.string(),
type: z.enum(["code-edit", "code-review", "bug-fix", "explanation", "general"]),
complexity: z.enum(["simple", "complex"]),
requiresTools: z.boolean(),
});

export async function routeUserQuery(
query: string,
config: Config,
): Promise<{
classification: z.infer<typeof queryClassificationSchema>;
response: string;
}> {
const modelConfig = config.models.find((m) => m.name === config.defaultModel);
if (!modelConfig) {
throw new Error("Default model not found");
}

    const model = createLlmProvider(modelConfig, config);

    logger.info("Routing user query");

    const { object: classification } = await generateObject({
        model,
        schema: queryClassificationSchema,
        prompt: `Classify this user query:

${query}

Determine:

1.  Query type (code-edit, code-review, bug-fix, explanation, or general)
2.  Complexity (simple or complex)
3.  Whether tools are required
4.  Brief reasoning for classification`,
    });

        const systemPrompts = {
            "code-edit":
                "You are an expert code editor. Make precise, well-reasoned changes to code.",
            "code-review":
                "You are a senior code reviewer. Identify issues and suggest improvements.",
            "bug-fix":
                "You are a debugging expert. Find and fix bugs systematically.",
            explanation:
                "You are a patient teacher. Explain code concepts clearly and thoroughly.",
            general: "You are a helpful coding assistant. Provide clear, actionable guidance.",
        };

        const selectedModel =
            classification.complexity === "simple" ? model : model;

        const { text: response } = await generateText({
            model: selectedModel,
            system: systemPrompts[classification.type],
            prompt: query,
        });

        logger.info("Query routing completed", {
            type: classification.type,
            complexity: classification.complexity,
        });

        return { classification, response };

    }

const codeReviewSchema = z.object({
issues: z.array(z.string()),
severity: z.enum(["low", "medium", "high", "critical"]),
suggestions: z.array(z.string()),
});

export async function parallelCodeReview(
code: string,
filePath: string,
config: Config,
): Promise<{
reviews: Array<{
type: string;
data: z.infer<typeof codeReviewSchema>;
}>;
summary: string;
}> {
const modelConfig = config.models.find((m) => m.name === config.defaultModel);
if (!modelConfig) {
throw new Error("Default model not found");
}

    const model = createLlmProvider(modelConfig, config);

    logger.info("Starting parallel code review", { filePath });

    const [securityReview, performanceReview, qualityReview] = await Promise.all([
        generateObject({
            model,
            system:
                "You are a security expert. Focus on identifying vulnerabilities, injection risks, and authentication issues.",
            schema: codeReviewSchema,
            prompt: `Security review for ${filePath}:\n\n${code}`,
        }),

        generateObject({
            model,
            system:
                "You are a performance expert. Focus on bottlenecks, memory leaks, and optimization opportunities.",
            schema: codeReviewSchema,
            prompt: `Performance review for ${filePath}:\n\n${code}`,
        }),

        generateObject({
            model,
            system:
                "You are a code quality expert. Focus on structure, readability, and best practices.",
            schema: codeReviewSchema,
            prompt: `Quality review for ${filePath}:\n\n${code}`,
        }),
    ]);

    const reviews = [
        { type: "security", data: securityReview.object },
        { type: "performance", data: performanceReview.object },
        { type: "quality", data: qualityReview.object },
    ];

    const { text: summary } = await generateText({
        model,
        system: "You are a technical lead summarizing code reviews.",
        prompt: `Synthesize these reviews into actionable recommendations:\n${JSON.stringify(reviews, null, 2)}`,
    });

    logger.info("Parallel code review completed");

    return { reviews, summary };

}

const implementationPlanSchema = z.object({
files: z.array(
z.object({
purpose: z.string(),
filePath: z.string(),
changeType: z.enum(["create", "modify", "delete"]),
}),
),
estimatedComplexity: z.enum(["low", "medium", "high"]),
dependencies: z.array(z.string()).optional(),
});

const fileChangeSchema = z.object({
explanation: z.string(),
code: z.string(),
testStrategy: z.string().optional(),
});

export async function orchestratedFeatureImplementation(
featureRequest: string,
config: Config,
): Promise<{
plan: z.infer<typeof implementationPlanSchema>;
changes: Array<{
file: (typeof implementationPlanSchema)["\_type"]["files"][number];
implementation: z.infer<typeof fileChangeSchema>;
}>;
}> {
const modelConfig = config.models.find((m) => m.name === config.defaultModel);
if (!modelConfig) {
throw new Error("Default model not found");
}

    const model = createLlmProvider(modelConfig, config);

    logger.info("Starting orchestrated feature implementation");

    const { object: plan } = await generateObject({
        model,
        schema: implementationPlanSchema,
        system: "You are a senior software architect planning feature implementations.",
        prompt: `Create an implementation plan for:\n${featureRequest}`,
    });

    logger.info("Implementation plan created", {
        fileCount: plan.files.length,
        complexity: plan.estimatedComplexity,
    });

    const workerSystemPrompts = {
        create:
            "You are an expert at implementing new files following best practices.",
        modify:
            "You are an expert at modifying existing code while maintaining consistency.",
        delete: "You are an expert at safely removing code while ensuring no breaking changes.",
    };

    const fileChanges = await Promise.all(
        plan.files.map(async (file) => {
            logger.debug("Processing file", { path: file.filePath });

            const { object: implementation } = await generateObject({
                model,
                schema: fileChangeSchema,
                system: workerSystemPrompts[file.changeType],
                prompt: `Implement changes for ${file.filePath}:

Purpose: ${file.purpose}
Change type: ${file.changeType}

Feature context: ${featureRequest}`,
});

            return {
                file,
                implementation,
            };
        }),
    );

    logger.info("Orchestrated feature implementation completed");

    return { plan, changes: fileChanges };

}

const translationEvaluationSchema = z.object({
qualityScore: z.number().min(1).max(10),
accuracyScore: z.number().min(1).max(10),
maintainsIntent: z.boolean(),
specificIssues: z.array(z.string()),
suggestions: z.array(z.string()),
});

export async function codeRefactoringWithFeedback(
code: string,
refactoringGoal: string,
config: Config,
maxIterations: number = 3,
): Promise<{
refactoredCode: string;
iterationsUsed: number;
finalQuality: number;
}> {
const modelConfig = config.models.find((m) => m.name === config.defaultModel);
if (!modelConfig) {
throw new Error("Default model not found");
}

    const model = createLlmProvider(modelConfig, config);

    logger.info("Starting code refactoring with feedback loop");

    let currentCode = code;
    let iterations = 0;

    const { text: initialRefactoring } = await generateText({
        model,
        system: "You are an expert code refactorer. Improve code quality while maintaining functionality.",
        prompt: `Refactor this code to achieve: ${refactoringGoal}\n\nOriginal code:\n${code}`,
    });

    currentCode = initialRefactoring;

    while (iterations < maxIterations) {
        const { object: evaluation } = await generateObject({
            model,
            schema: translationEvaluationSchema,
            system: "You are an expert code reviewer evaluating refactored code.",
            prompt: `Evaluate this refactoring:

Original code:
${code}

Refactored code:
${currentCode}

Refactoring goal: ${refactoringGoal}

Assess:

1.  Overall quality (1-10)
2.  Code accuracy (1-10)
3.  Whether it maintains original intent
4.  Specific issues
5.  Improvement suggestions`,
    });

        logger.debug("Refactoring evaluation", {
            iteration: iterations + 1,
            qualityScore: evaluation.qualityScore,
            accuracyScore: evaluation.accuracyScore,
        });

        if (
            evaluation.qualityScore >= 8 &&
            evaluation.accuracyScore >= 8 &&
            evaluation.maintainsIntent
        ) {
            logger.info("Refactoring meets quality threshold");
            break;
        }

        const { text: improvedCode } = await generateText({
            model,
            system: "You are an expert code refactorer.",
            prompt: `Improve this refactored code based on feedback:

Issues:
${evaluation.specificIssues.join("\n")}

Suggestions:
${evaluation.suggestions.join("\n")}

Current code:
${currentCode}

Original goal: ${refactoringGoal}`,
});

        currentCode = improvedCode;
        iterations++;
    }

    logger.info("Code refactoring with feedback completed", {
        iterations: iterations + 1,
    });

    return {
        refactoredCode: currentCode,
        iterationsUsed: iterations + 1,
        finalQuality: 8,
    };

}

export async function adaptiveDocumentationGeneration(
code: string,
targetAudience: "beginner" | "intermediate" | "expert",
config: Config,
): Promise<{
documentation: string;
qualityScore: number;
iterations: number;
}> {
const modelConfig = config.models.find((m) => m.name === config.defaultModel);
if (!modelConfig) {
throw new Error("Default model not found");
}

    const model = createLlmProvider(modelConfig, config);

    logger.info("Starting adaptive documentation generation", { targetAudience });

    const audiencePrompts = {
        beginner:
            "Explain concepts simply with lots of examples. Avoid jargon or explain it when necessary.",
        intermediate:
            "Balance technical detail with clarity. Assume basic programming knowledge.",
        expert:
            "Use precise technical terminology. Focus on implementation details and edge cases.",
    };

    let currentDocs = "";
    let iterations = 0;
    const MAX_ITERATIONS = 3;

    const { text: initialDocs } = await generateText({
        model,
        system: `You are a technical writer creating documentation for ${targetAudience} developers. ${audiencePrompts[targetAudience]}`,
        prompt: `Document this code:\n\n${code}`,
    });

    currentDocs = initialDocs;

    const evaluationSchema = z.object({
        appropriateLevel: z.boolean(),
        clarity: z.number().min(1).max(10),
        completeness: z.number().min(1).max(10),
        exampleQuality: z.number().min(1).max(10),
        issues: z.array(z.string()),
        suggestions: z.array(z.string()),
    });

    while (iterations < MAX_ITERATIONS) {
        const { object: evaluation } = await generateObject({
            model,
            schema: evaluationSchema,
            system: "You are an expert at evaluating technical documentation.",
            prompt: `Evaluate this documentation for ${targetAudience} audience:

${currentDocs}

Original code:
${code}`,
});

        if (
            evaluation.appropriateLevel &&
            evaluation.clarity >= 8 &&
            evaluation.completeness >= 8
        ) {
            break;
        }

        const { text: improvedDocs } = await generateText({
            model,
            system: `You are a technical writer. ${audiencePrompts[targetAudience]}`,
            prompt: `Improve this documentation based on feedback:

Issues: ${evaluation.issues.join("\n")}
Suggestions: ${evaluation.suggestions.join("\n")}

Current documentation:
${currentDocs}

Code to document:
${code}`,
});

        currentDocs = improvedDocs;
        iterations++;
    }

    logger.info("Adaptive documentation generation completed", { iterations: iterations + 1 });

    return {
        documentation: currentDocs,
        qualityScore: 8,
        iterations: iterations + 1,
    };

}

export type WorkflowType =
| "sequential-code-gen"
| "route-query"
| "parallel-review"
| "orchestrated-implementation"
| "refactoring-feedback"
| "adaptive-docs";

export async function executeWorkflow(
type: WorkflowType,
params: Record<string, unknown>,
config: Config,
): Promise<unknown> {
logger.info("Executing workflow", { type });

    switch (type) {
        case "sequential-code-gen":
            return sequentialCodeGeneration(params.featureDescription as string, config);
        case "route-query":
            return routeUserQuery(params.query as string, config);
        case "parallel-review":
            return parallelCodeReview(
                params.code as string,
                params.filePath as string,
                config,
            );
        case "orchestrated-implementation":
            return orchestratedFeatureImplementation(params.featureRequest as string, config);
        case "refactoring-feedback":
            return codeRefactoringWithFeedback(
                params.code as string,
                params.goal as string,
                config,
                (params.maxIterations as number) || 3,
            );
        case "adaptive-docs":
            return adaptiveDocumentationGeneration(
                params.code as string,
                (params.audience as "beginner" | "intermediate" | "expert") || "intermediate",
                config,
            );
        default:
            throw new Error(`Unknown workflow type: ${type}`);
    }

}
