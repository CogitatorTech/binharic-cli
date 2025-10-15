import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeWorkflow, routeUserQuery } from "@/agent/workflows/index.js";
import type { Config } from "@/config.js";

const mockConfig: Config = {
    defaultModel: "gpt-4",
    models: [
        {
            name: "gpt-4",
            provider: "openai",
            modelId: "gpt-4",
            context: 8000,
        },
    ],
    history: {
        maxItems: 50,
    },
    userName: "TestUser",
};

vi.mock("@/agent/llm/provider.js", () => ({
    createLlmProvider: vi.fn(() => ({
        id: "mock-model",
        provider: "openai",
    })),
}));

vi.mock("ai", () => ({
    generateText: vi.fn(async () => ({
        text: "Mock response text",
    })),
    generateObject: vi.fn(async () => ({
        object: {
            reasoning: "Test query classification",
            type: "general",
            complexity: "simple",
            requiresTools: false,
        },
    })),
}));

describe("Workflow Bug Fixes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Fixed Model Selection Logic", () => {
        it("should properly route queries without redundant model selection", async () => {
            const { generateObject, generateText } = await import("ai");

            await routeUserQuery("test query", mockConfig);

            expect(generateObject).toHaveBeenCalledTimes(1);
            expect(generateText).toHaveBeenCalledTimes(1);

            const textCall = vi.mocked(generateText).mock.calls[0][0];
            expect(textCall.model).toBeDefined();
            expect(textCall.system).toBeTruthy();
        });
    });

    describe("Workflow Execution", () => {
        it("should execute route-query workflow", async () => {
            const result = await executeWorkflow(
                "route-query",
                { query: "How do I create a function?" },
                mockConfig,
            );

            expect(result).toBeDefined();
            expect((result as any).classification).toBeDefined();
            expect((result as any).response).toBeDefined();
        });

        it("should throw error for unknown workflow type", async () => {
            await expect(
                executeWorkflow("unknown-workflow" as any, {}, mockConfig),
            ).rejects.toThrow("Unknown workflow type");
        });
    });
});
