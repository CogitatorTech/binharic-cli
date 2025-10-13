import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBinharicAgent, createAgentByType } from "../../src/agent/agents";
import type { Config } from "../../src/config";

vi.mock("../../src/agent/llm", () => ({
    createLlmProvider: vi.fn(() => "mocked-llm-provider"),
}));

vi.mock("../../src/agent/systemPrompt", () => ({
    generateSystemPrompt: vi.fn(async () => "Test system prompt"),
}));

describe("Agent Factories", () => {
    let mockConfig: Config;

    beforeEach(() => {
        mockConfig = {
            userName: "testuser",
            systemPrompt: "You are a test agent",
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

    describe("createBinharicAgent", () => {
        it("should create an agent with the correct configuration", async () => {
            const agent = await createBinharicAgent(mockConfig);
            expect(agent).toBeDefined();
        });

        it("should throw error if model not found", async () => {
            const invalidConfig = { ...mockConfig, defaultModel: "nonexistent" };
            await expect(createBinharicAgent(invalidConfig)).rejects.toThrow(
                "Model nonexistent not found in configuration",
            );
        });

        it("should use custom system prompt from config", async () => {
            const customConfig = {
                ...mockConfig,
                systemPrompt: "Custom prompt for testing",
            };
            const agent = await createBinharicAgent(customConfig);
            expect(agent).toBeDefined();
        });
    });

    describe("createAgentByType", () => {
        it("should create general agent", async () => {
            const agent = await createAgentByType("general", mockConfig);
            expect(agent).toBeDefined();
        });

        it("should create documentation agent", async () => {
            const agent = await createAgentByType("documentation", mockConfig);
            expect(agent).toBeDefined();
        });

        it("should throw error for unknown agent type", async () => {
            await expect(createAgentByType("unknown" as any, mockConfig)).rejects.toThrow(
                "Unknown agent type",
            );
        });
    });
});
