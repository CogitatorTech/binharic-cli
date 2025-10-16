import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeWorkflow, routeUserQuery } from "../../../src/agent/workflows";
import type { Config } from "../../../src/config";

vi.mock("@/agent/llm/provider.js", () => ({
    createLlmProvider: vi.fn(() => "mocked-llm-provider"),
}));

vi.mock("ai", async (importOriginal) => {
    const actual: any = await importOriginal();
    return {
        ...actual,
        generateText: vi.fn(async () => ({ text: "Generated text result" })),
        generateObject: vi.fn(async () => ({
            object: {
                reasoning: "Test reasoning",
                type: "code-edit",
                complexity: "simple",
                requiresTools: false,
            },
        })),
        tool: actual.tool,
    };
});

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

    describe("Workflow Executor", () => {
        it("should execute route-query workflow", async () => {
            const result = await executeWorkflow(
                "route-query",
                { query: "Help me debug" },
                mockConfig,
            );

            expect(result).toBeDefined();
            expect(result).toHaveProperty("classification");
            expect(result).toHaveProperty("response");
        });

        it("should throw error for unknown workflow type", async () => {
            await expect(executeWorkflow("unknown" as any, {}, mockConfig)).rejects.toThrow(
                "Unknown workflow type",
            );
        });
    });
});
