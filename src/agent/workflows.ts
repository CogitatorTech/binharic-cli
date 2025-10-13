import { generateText, generateObject } from "ai";
import { z } from "zod";
import type { Config } from "@/config.js";
import { createLlmProvider } from "./llm.js";
import logger from "@/logger.js";

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
1. Query type (code-edit, code-review, bug-fix, explanation, or general)
2. Complexity (simple or complex)
3. Whether tools are required
4. Brief reasoning for classification`,
    });

    const systemPrompts = {
        "code-edit": "You are an expert code editor. Make precise, well-reasoned changes to code.",
        "code-review": "You are a senior code reviewer. Identify issues and suggest improvements.",
        "bug-fix": "You are a debugging expert. Find and fix bugs systematically.",
        explanation: "You are a patient teacher. Explain code concepts clearly and thoroughly.",
        general: "You are a helpful coding assistant. Provide clear, actionable guidance.",
    };

    const { text: response } = await generateText({
        model,
        system: systemPrompts[classification.type],
        prompt: query,
    });

    logger.info("Query routing completed", {
        type: classification.type,
        complexity: classification.complexity,
        requiresTools: classification.requiresTools,
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
            system: "You are a security expert. Focus on identifying vulnerabilities, injection risks, and authentication issues.",
            schema: codeReviewSchema,
            prompt: `Security review for ${filePath}:\n\n${code}`,
        }),

        generateObject({
            model,
            system: "You are a performance expert. Focus on bottlenecks, memory leaks, and optimization opportunities.",
            schema: codeReviewSchema,
            prompt: `Performance review for ${filePath}:\n\n${code}`,
        }),

        generateObject({
            model,
            system: "You are a code quality expert. Focus on structure, readability, and best practices.",
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
        file: z.infer<typeof implementationPlanSchema>["files"][number];
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
        create: "You are an expert at implementing new files following best practices.",
        modify: "You are an expert at modifying existing code while maintaining consistency.",
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
1. Overall quality (1-10)
2. Code accuracy (1-10)
3. Whether it maintains original intent
4. Specific issues
5. Improvement suggestions`,
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
        intermediate: "Balance technical detail with clarity. Assume basic programming knowledge.",
        expert: "Use precise technical terminology. Focus on implementation details and edge cases.",
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
            return parallelCodeReview(params.code as string, params.filePath as string, config);
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
