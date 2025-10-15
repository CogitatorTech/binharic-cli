import { generateObject, streamObject } from "ai";
import { z } from "zod";
import type { Config } from "@/config.js";
import { createLlmProvider } from "../llm/provider.js";
import logger from "@/logger.js";

const documentationSchema = z.object({
    summary: z.string().describe("Brief summary of what the code does"),
    description: z.string().describe("Detailed description of functionality"),
    parameters: z
        .array(
            z.object({
                name: z.string(),
                type: z.string(),
                description: z.string(),
                optional: z.boolean(),
                defaultValue: z.string().optional(),
            }),
        )
        .optional(),
    returns: z
        .object({
            type: z.string(),
            description: z.string(),
        })
        .optional(),
    throws: z
        .array(
            z.object({
                type: z.string(),
                condition: z.string(),
            }),
        )
        .optional(),
    examples: z.array(
        z.object({
            title: z.string(),
            code: z.string(),
            output: z.string().optional(),
        }),
    ),
    complexity: z.string().optional(),
    notes: z.array(z.string()).optional(),
});

export type Documentation = z.infer<typeof documentationSchema>;

export async function* generateDocumentation(
    code: string,
    style: "jsdoc" | "markdown" | "inline",
    config: Config,
): AsyncGenerator<Partial<Documentation>, Documentation, unknown> {
    const modelConfig = config.models.find((m) => m.name === config.defaultModel);
    if (!modelConfig) {
        throw new Error("Default model not found in config");
    }

    const llmProvider = createLlmProvider(modelConfig, config);

    const { partialObjectStream, object } = streamObject({
        model: llmProvider,
        schema: documentationSchema,
        schemaName: "CodeDocumentation",
        schemaDescription: "Comprehensive documentation for code",
        prompt: `Generate ${style} documentation for the following code:

\`\`\`
${code}
\`\`\`

Include:
- Summary and detailed description
- Parameters (if applicable)
- Return value (if applicable)
- Exceptions/errors thrown
- Usage examples
- Complexity notes
- Important notes or warnings`,
        onError({ error }) {
            logger.error("Error during documentation generation:", error);
        },
    });

    for await (const partialDoc of partialObjectStream) {
        yield partialDoc as Partial<Documentation>;
    }

    const finalDoc = await object;
    logger.info("Documentation generation completed", {
        examplesCount: finalDoc.examples.length,
        hasParams: !!finalDoc.parameters,
    });

    return finalDoc;
}

const codeExplanationSchema = z.object({
    overallPurpose: z.string(),
    keyComponents: z.array(
        z.object({
            name: z.string(),
            purpose: z.string(),
            howItWorks: z.string(),
        }),
    ),
    dataFlow: z.string().describe("How data flows through the code"),
    algorithms: z
        .array(
            z.object({
                name: z.string(),
                description: z.string(),
                complexity: z.string(),
            }),
        )
        .optional(),
    dependencies: z
        .array(
            z.object({
                name: z.string(),
                purpose: z.string(),
            }),
        )
        .optional(),
    designPatterns: z.array(z.string()).optional(),
    improvementAreas: z.array(z.string()).optional(),
});

export type CodeExplanation = z.infer<typeof codeExplanationSchema>;

export async function* explainCode(
    code: string,
    context: string,
    config: Config,
): AsyncGenerator<Partial<CodeExplanation>, CodeExplanation, unknown> {
    const modelConfig = config.models.find((m) => m.name === config.defaultModel);
    if (!modelConfig) {
        throw new Error("Default model not found in config");
    }

    const llmProvider = createLlmProvider(modelConfig, config);

    const { partialObjectStream, object } = streamObject({
        model: llmProvider,
        schema: codeExplanationSchema,
        schemaName: "CodeExplanation",
        schemaDescription: "Detailed explanation of code functionality and structure",
        prompt: `Explain the following code in detail. Context: ${context}

\`\`\`
${code}
\`\`\`

Provide:
- Overall purpose
- Key components and their roles
- Data flow explanation
- Algorithms used (if any)
- Dependencies and their purposes
- Design patterns (if applicable)
- Areas that could be improved`,
        onError({ error }) {
            logger.error("Error during code explanation:", error);
        },
    });

    for await (const partialExplanation of partialObjectStream) {
        yield partialExplanation as Partial<CodeExplanation>;
    }

    const finalExplanation = await object;
    logger.info("Code explanation completed", {
        componentsCount: finalExplanation.keyComponents.length,
        hasPatterns: !!finalExplanation.designPatterns,
    });

    return finalExplanation;
}

const dependencyAnalysisSchema = z.object({
    directDependencies: z.array(
        z.object({
            name: z.string(),
            version: z.string().optional(),
            purpose: z.string(),
            risk: z.enum(["low", "medium", "high"]),
        }),
    ),
    indirectDependencies: z.array(z.string()).optional(),
    outdatedPackages: z
        .array(
            z.object({
                name: z.string(),
                currentVersion: z.string(),
                latestVersion: z.string(),
                changeType: z.enum(["major", "minor", "patch"]),
            }),
        )
        .optional(),
    securityIssues: z
        .array(
            z.object({
                package: z.string(),
                vulnerability: z.string(),
                severity: z.enum(["low", "medium", "high", "critical"]),
                recommendation: z.string(),
            }),
        )
        .optional(),
    recommendations: z.array(z.string()),
    overallHealth: z.enum(["excellent", "good", "fair", "poor"]),
});

export type DependencyAnalysis = z.infer<typeof dependencyAnalysisSchema>;

export async function analyzeDependencies(
    packageJsonContent: string,
    config: Config,
): Promise<DependencyAnalysis | null> {
    try {
        const modelConfig = config.models.find((m) => m.name === config.defaultModel);
        if (!modelConfig) {
            logger.error("Default model not found in config");
            return null;
        }

        const llmProvider = createLlmProvider(modelConfig, config);

        const { object } = await streamObject({
            model: llmProvider,
            schema: dependencyAnalysisSchema,
            schemaName: "DependencyAnalysis",
            schemaDescription: "Analysis of project dependencies, security, and health",
            prompt: `Analyze the dependencies in this package.json:

\`\`\`json
${packageJsonContent}
\`\`\`

Provide:
- List of direct dependencies with their purpose and risk assessment
- Security issues (if any)
- Outdated packages
- Recommendations for improvements
- Overall dependency health assessment`,
            onError({ error }) {
                logger.error("Error during dependency analysis:", error);
            },
        });

        const result = await object;

        logger.info("Dependency analysis completed", {
            dependenciesCount: result.directDependencies.length,
            securityIssues: result.securityIssues?.length || 0,
            overallHealth: result.overallHealth,
        });

        return result;
    } catch (error) {
        logger.error("Dependency analysis failed", { error });
        return null;
    }
}

const codeAnalysisSchema = z.object({
    language: z.string().describe("Programming language detected"),
    complexity: z.enum(["low", "medium", "high"]).describe("Code complexity level"),
    issues: z
        .array(
            z.object({
                type: z.enum(["bug", "smell", "performance", "security", "style"]),
                severity: z.enum(["low", "medium", "high", "critical"]),
                line: z.number().optional().describe("Line number where issue occurs"),
                description: z.string(),
                suggestion: z.string().describe("How to fix the issue"),
            }),
        )
        .describe("List of identified issues"),
    metrics: z
        .object({
            linesOfCode: z.number(),
            cyclomaticComplexity: z.number().optional(),
            maintainabilityIndex: z.number().min(0).max(100).optional(),
        })
        .describe("Code metrics"),
    summary: z.string().describe("Overall assessment of the code quality"),
});

export type CodeAnalysis = z.infer<typeof codeAnalysisSchema>;

export async function analyzeCode(
    code: string,
    filePath: string,
    config: Config,
): Promise<CodeAnalysis | null> {
    try {
        const modelConfig = config.models.find((m) => m.name === config.defaultModel);
        if (!modelConfig) {
            logger.error("Default model not found in config");
            return null;
        }

        const llmProvider = createLlmProvider(modelConfig, config);

        const { object } = await generateObject({
            model: llmProvider,
            schema: codeAnalysisSchema,
            schemaName: "CodeAnalysis",
            schemaDescription: "Comprehensive analysis of code quality, issues, and metrics",
            prompt: `Analyze the following code from ${filePath}:

\`\`\`
${code}
\`\`\`

Provide a comprehensive analysis including:
- Detected language
- Complexity assessment
- List of issues (bugs, code smells, performance issues, security vulnerabilities)
- Code metrics
- Overall summary`,
        });

        logger.info("Code analysis completed", {
            filePath,
            issuesFound: object.issues.length,
            complexity: object.complexity,
        });

        return object;
    } catch (error) {
        logger.error("Code analysis failed", { error, filePath });
        return null;
    }
}

const refactoringSchema = z.object({
    canRefactor: z.boolean().describe("Whether refactoring is possible and recommended"),
    confidence: z.enum(["low", "medium", "high"]).describe("Confidence in the refactoring"),
    refactoredCode: z.string().describe("The refactored version of the code"),
    changes: z
        .array(
            z.object({
                type: z.enum(["extract", "rename", "simplify", "optimize", "modernize"]),
                description: z.string(),
                benefit: z.string().describe("Why this change improves the code"),
            }),
        )
        .describe("List of changes made during refactoring"),
    explanation: z.string().describe("Overall explanation of the refactoring approach"),
});

export type RefactoringSuggestion = z.infer<typeof refactoringSchema>;

export async function suggestRefactoring(
    code: string,
    intent: string,
    config: Config,
): Promise<RefactoringSuggestion | null> {
    try {
        const modelConfig = config.models.find((m) => m.name === config.defaultModel);
        if (!modelConfig) {
            logger.error("Default model not found in config");
            return null;
        }

        const llmProvider = createLlmProvider(modelConfig, config);

        const { object } = await generateObject({
            model: llmProvider,
            schema: refactoringSchema,
            schemaName: "RefactoringSuggestion",
            schemaDescription: "Refactoring suggestion with improved code and explanation",
            prompt: `Refactor the following code based on this intent: "${intent}"

Original code:
\`\`\`
${code}
\`\`\`

Provide:
- Whether refactoring is recommended
- Your confidence level
- Refactored code
- List of specific changes made
- Overall explanation`,
        });

        logger.info("Refactoring suggestion generated", {
            canRefactor: object.canRefactor,
            confidence: object.confidence,
            changesCount: object.changes.length,
        });

        return object;
    } catch (error) {
        logger.error("Refactoring suggestion failed", { error });
        return null;
    }
}

const testGenerationSchema = z.object({
    testFramework: z.string().describe("Test framework to use (e.g., vitest, jest)"),
    testCases: z.array(
        z.object({
            name: z.string().describe("Test case name"),
            description: z.string().describe("What this test validates"),
            code: z.string().describe("Test code"),
            type: z.enum(["unit", "integration", "edge-case"]),
        }),
    ),
    imports: z.array(z.string()).describe("Required imports for the tests"),
    setup: z.string().optional().describe("Setup code needed before tests"),
    teardown: z.string().optional().describe("Teardown code needed after tests"),
    coverage: z.object({
        expectedCoverage: z.number().min(0).max(100),
        uncoveredScenarios: z.array(z.string()).describe("Scenarios not covered by these tests"),
    }),
});

export type TestSuggestion = z.infer<typeof testGenerationSchema>;

export async function generateTests(
    code: string,
    filePath: string,
    config: Config,
): Promise<TestSuggestion | null> {
    try {
        const modelConfig = config.models.find((m) => m.name === config.defaultModel);
        if (!modelConfig) {
            logger.error("Default model not found in config");
            return null;
        }

        const llmProvider = createLlmProvider(modelConfig, config);

        const { object } = await generateObject({
            model: llmProvider,
            schema: testGenerationSchema,
            schemaName: "TestSuggestion",
            schemaDescription: "Comprehensive test suite generation for code",
            prompt: `Generate comprehensive tests for the following code from ${filePath}:

\`\`\`
${code}
\`\`\`

Generate:
- Appropriate test framework
- Multiple test cases (unit tests, integration tests, edge cases)
- Required imports
- Setup/teardown if needed
- Coverage estimation and uncovered scenarios`,
        });

        logger.info("Test generation completed", {
            filePath,
            testCount: object.testCases.length,
            expectedCoverage: object.coverage.expectedCoverage,
        });

        return object;
    } catch (error) {
        logger.error("Test generation failed", { error, filePath });
        return null;
    }
}

const securityAuditSchema = z.object({
    overallRisk: z.enum(["low", "medium", "high", "critical"]),
    vulnerabilities: z.array(
        z.object({
            id: z.string().describe("Vulnerability identifier"),
            type: z.string().describe("Type of vulnerability (e.g., SQL Injection, XSS)"),
            severity: z.enum(["low", "medium", "high", "critical"]),
            location: z.string().describe("Where in the code this vulnerability exists"),
            description: z.string(),
            impact: z.string().describe("Potential impact if exploited"),
            recommendation: z.string().describe("How to fix this vulnerability"),
            cweId: z
                .string()
                .optional()
                .describe("CWE (Common Weakness Enumeration) ID if applicable"),
        }),
    ),
    securePatterns: z.array(z.string()).describe("Security patterns already in use"),
    recommendations: z.array(z.string()).describe("General security recommendations"),
    summary: z.string().describe("Overall security assessment"),
});

export type SecurityAudit = z.infer<typeof securityAuditSchema>;

export async function auditSecurity(
    code: string,
    filePath: string,
    config: Config,
): Promise<SecurityAudit | null> {
    try {
        const modelConfig = config.models.find((m) => m.name === config.defaultModel);
        if (!modelConfig) {
            logger.error("Default model not found in config");
            return null;
        }

        const llmProvider = createLlmProvider(modelConfig, config);

        const { object } = await generateObject({
            model: llmProvider,
            schema: securityAuditSchema,
            schemaName: "SecurityAudit",
            schemaDescription: "Comprehensive security audit of code",
            prompt: `Perform a security audit on the following code from ${filePath}:

\`\`\`
${code}
\`\`\`

Identify:
- All security vulnerabilities
- Severity and impact of each vulnerability
- Secure patterns already in use
- Recommendations for improvement
- Overall risk assessment`,
        });

        logger.info("Security audit completed", {
            filePath,
            vulnerabilitiesFound: object.vulnerabilities.length,
            overallRisk: object.overallRisk,
        });

        return object;
    } catch (error) {
        logger.error("Security audit failed", { error, filePath });
        return null;
    }
}
