import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    sequentialCodeGeneration,
    routeUserQuery,
    parallelCodeReview,
    orchestratedFeatureImplementation,
    codeRefactoringWithFeedback,
    adaptiveDocumentationGeneration,
    executeWorkflow,
} from "../../src/agent/workflows";
import type { Config } from "../../src/config";

vi.mock("@/agent/llm", () => ({
    createLlmProvider: vi.fn(() => "mocked-llm-provider"),
}));

vi.mock("ai", () => ({
    generateText: vi.fn(async () => ({ text: "Generated text result" })),
    generateObject: vi.fn(async () => ({
        object: {
            reasoning: "Test reasoning",
            type: "code-edit",
            complexity: "simple",
            requiresTools: false,
            issues: ["Issue 1"],
            severity: "medium",
            suggestions: ["Suggestion 1"],
            files: [
                {
                    purpose: "Test file",
                    filePath: "/test/file.ts",
                    changeType: "create",
                },
            ],
            estimatedComplexity: "low",
            explanation: "Test explanation",
            code: "const test = true;",
            qualityScore: 9,
            accuracyScore: 9,
            maintainsIntent: true,
            specificIssues: [],
            appropriateLevel: true,
            clarity: 9,
            completeness: 9,
            exampleQuality: 9,
        },
    })),
}));

describe("Workflow Patterns", () => {
    let mockConfig: Config;

    beforeEach(() => {
        mockConfig = {
            userName: "testuser",
            systemPrompt: "Test system prompt",
            defaultModel: "test-model",
            models: [
                {
                    name: "test-model",
                    provider: "openai",
                    modelId: "gpt-4o",
                    context: 128000,
                },
            ],
            history: { maxItems: null },
        };
    });

    describe("Sequential Processing", () => {
        it("should generate code, tests, and documentation in sequence", async () => {
            const result = await sequentialCodeGeneration(
                "Create a user authentication function",
                mockConfig,
            );

            expect(result).toHaveProperty("code");
            expect(result).toHaveProperty("tests");
            expect(result).toHaveProperty("documentation");
            expect(typeof result.code).toBe("string");
        });
    });

    describe("Routing Pattern", () => {
        it("should classify and route user queries appropriately", async () => {
            const result = await routeUserQuery("Fix the bug in my code", mockConfig);

            expect(result).toHaveProperty("classification");
            expect(result).toHaveProperty("response");
            expect(result.classification).toHaveProperty("type");
            expect(result.classification).toHaveProperty("complexity");
        });

        it("should handle different query types", async () => {
            const queries = [
                "Review my code for issues",
                "Explain how async/await works",
                "Help me refactor this function",
            ];

            for (const query of queries) {
                const result = await routeUserQuery(query, mockConfig);
                expect(result.classification.type).toBeDefined();
            }
        });
    });

    describe("Parallel Processing", () => {
        it("should perform parallel code reviews", async () => {
            const code = "function test() { return true; }";
            const result = await parallelCodeReview(code, "/test/file.ts", mockConfig);

            expect(result).toHaveProperty("reviews");
            expect(result).toHaveProperty("summary");
            expect(result.reviews).toHaveLength(3);
            expect(result.reviews[0]).toHaveProperty("type");
            expect(result.reviews[0]).toHaveProperty("data");
        });

        it("should include security, performance, and quality reviews", async () => {
            const code = "const data = userInput;";
            const result = await parallelCodeReview(code, "/test/security.ts", mockConfig);

            const reviewTypes = result.reviews.map((r) => r.type);
            expect(reviewTypes).toContain("security");
            expect(reviewTypes).toContain("performance");
            expect(reviewTypes).toContain("quality");
        });
    });

    describe("Orchestrator-Worker Pattern", () => {
        it("should create implementation plan and execute changes", async () => {
            const result = await orchestratedFeatureImplementation(
                "Add user profile page",
                mockConfig,
            );

            expect(result).toHaveProperty("plan");
            expect(result).toHaveProperty("changes");
            expect(result.plan).toHaveProperty("files");
            expect(result.plan).toHaveProperty("estimatedComplexity");
        });

        it("should handle multiple file changes", async () => {
            const result = await orchestratedFeatureImplementation(
                "Implement shopping cart functionality",
                mockConfig,
            );

            expect(Array.isArray(result.changes)).toBe(true);
            expect(result.changes.length).toBeGreaterThan(0);
        });
    });

    describe("Evaluator-Optimizer Pattern", () => {
        it("should refactor code with iterative feedback", async () => {
            const code = "function add(a,b){return a+b}";
            const result = await codeRefactoringWithFeedback(
                code,
                "Add proper formatting and error handling",
                mockConfig,
            );

            expect(result).toHaveProperty("refactoredCode");
            expect(result).toHaveProperty("iterationsUsed");
            expect(result).toHaveProperty("finalQuality");
            expect(result.iterationsUsed).toBeGreaterThan(0);
        });

        it("should stop when quality threshold is met", async () => {
            const code = "const x = 1;";
            const result = await codeRefactoringWithFeedback(code, "Add comments", mockConfig);

            expect(result.iterationsUsed).toBeLessThanOrEqual(3);
        });
    });

    describe("Adaptive Documentation", () => {
        it("should generate documentation for different audiences", async () => {
            const code = "async function fetchData() { /* ... */ }";

            const beginnerDocs = await adaptiveDocumentationGeneration(
                code,
                "beginner",
                mockConfig,
            );
            const expertDocs = await adaptiveDocumentationGeneration(code, "expert", mockConfig);

            expect(beginnerDocs.documentation).toBeDefined();
            expect(expertDocs.documentation).toBeDefined();
            expect(beginnerDocs).toHaveProperty("qualityScore");
            expect(expertDocs).toHaveProperty("qualityScore");
        });

        it("should iterate until quality threshold is met", async () => {
            const code = "function test() {}";
            const result = await adaptiveDocumentationGeneration(code, "intermediate", mockConfig);

            expect(result.iterations).toBeGreaterThan(0);
            expect(result.iterations).toBeLessThanOrEqual(3);
        });
    });

    describe("Workflow Executor", () => {
        it("should execute sequential-code-gen workflow", async () => {
            const result = await executeWorkflow(
                "sequential-code-gen",
                { featureDescription: "Test feature" },
                mockConfig,
            );

            expect(result).toBeDefined();
        });

        it("should execute route-query workflow", async () => {
            const result = await executeWorkflow(
                "route-query",
                { query: "Help me debug" },
                mockConfig,
            );

            expect(result).toBeDefined();
        });

        it("should execute parallel-review workflow", async () => {
            const result = await executeWorkflow(
                "parallel-review",
                { code: "test code", filePath: "/test.ts" },
                mockConfig,
            );

            expect(result).toBeDefined();
        });

        it("should throw error for unknown workflow type", async () => {
            await expect(executeWorkflow("unknown" as any, {}, mockConfig)).rejects.toThrow(
                "Unknown workflow type",
            );
        });
    });
});
