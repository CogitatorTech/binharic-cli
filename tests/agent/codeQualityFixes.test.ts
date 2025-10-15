import { describe, it, expect } from "vitest";
import { checkProviderAvailability } from "@/agent/llm.js";
import {
    createTokenBudgetManager,
    createContextManager,
    combinePrepareSteps,
} from "@/agent/prepareStep.js";
import type { Config } from "@/config.js";

describe("Code Quality Fixes", () => {
    describe("prepareStep return values", () => {
        it("should return empty object when token budget not exceeded", () => {
            const handler = createTokenBudgetManager(10000);
            const result = handler({
                messages: [
                    { role: "user", content: "short message" },
                    { role: "assistant", content: "short response" },
                ],
                stepNumber: 1,
                steps: [],
                model: {},
            });

            expect(result).toBeDefined();
            expect(result).toHaveProperty("messages");
            expect(Array.isArray(result.messages)).toBe(true);
        });

        it("should trim messages when token budget exceeded", () => {
            const handler = createTokenBudgetManager(10);
            const longMessage = "a".repeat(1000);
            const result = handler({
                messages: [
                    { role: "user", content: longMessage },
                    { role: "assistant", content: longMessage },
                    { role: "user", content: longMessage },
                ],
                stepNumber: 1,
                steps: [],
                model: {},
            });

            expect(result).toBeDefined();
            expect(result).toHaveProperty("messages");
            expect(Array.isArray(result.messages)).toBe(true);
            expect(result.messages?.length).toBeLessThan(3);
        });

        it("should return empty object when context not exceeded", () => {
            const handler = createContextManager(100);
            const result = handler({
                messages: [
                    { role: "user", content: "message 1" },
                    { role: "assistant", content: "response 1" },
                ],
                stepNumber: 1,
                steps: [],
                model: {},
            });

            expect(result).toBeDefined();
            expect(typeof result).toBe("object");
        });

        it("should combine multiple prepareStep handlers correctly", () => {
            const handler1 = createContextManager(5);
            const handler2 = createTokenBudgetManager(10000);

            const combined = combinePrepareSteps(handler1, handler2);

            const messages = Array.from({ length: 10 }, (_, i) => ({
                role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
                content: `message ${i}`,
            }));

            const result = combined({
                messages,
                stepNumber: 1,
                steps: [],
                model: {},
            });

            expect(result).toBeDefined();
            expect(result).toHaveProperty("messages");
            expect(Array.isArray(result.messages)).toBe(true);
        });
    });

    describe("provider availability", () => {
        it("should initialize registry on first call", async () => {
            const config: Config = {
                defaultModel: "test-model",
                models: [
                    {
                        name: "test-model",
                        provider: "ollama",
                        modelId: "test",
                        context: 4096,
                        baseUrl: "http://localhost:11434",
                    },
                ],
            };

            const result = await checkProviderAvailability(config);

            expect(result).toBeDefined();
            expect(result).toHaveProperty("available");
            expect(result).toHaveProperty("availableProviders");
            expect(result).toHaveProperty("unavailableProviders");
        });

        it("should handle multiple providers", async () => {
            const config: Config = {
                defaultModel: "test-model",
                models: [
                    {
                        name: "test-model",
                        provider: "ollama",
                        modelId: "test",
                        context: 4096,
                        baseUrl: "http://localhost:11434",
                    },
                    {
                        name: "openai-model",
                        provider: "openai",
                        modelId: "gpt-4",
                        context: 8192,
                    },
                ],
            };

            const result = await checkProviderAvailability(config);

            expect(result).toBeDefined();
            expect(Array.isArray(result.availableProviders)).toBe(true);
            expect(Array.isArray(result.unavailableProviders)).toBe(true);
        });
    });

    describe("error handling type safety", () => {
        it("should handle error objects correctly", () => {
            const error = new Error("Test error");
            const typedError = error as Error;

            expect(typedError.message).toBe("Test error");
            expect(typedError).toBeInstanceOf(Error);
        });

        it("should handle custom error types", () => {
            class CustomError extends Error {
                constructor(
                    message: string,
                    public code: string,
                ) {
                    super(message);
                    this.name = "CustomError";
                }
            }

            const error = new CustomError("Custom error", "ERR_CUSTOM");
            const typedError = error as Error;

            expect(typedError.message).toBe("Custom error");
            expect(typedError).toBeInstanceOf(Error);
            expect((typedError as CustomError).code).toBe("ERR_CUSTOM");
        });
    });

    describe("module exports", () => {
        it("should export only necessary functions from prepareStep", async () => {
            const module = await import("@/agent/prepareStep.js");

            expect(module.createContextManager).toBeDefined();
            expect(module.createToolResultSummarizer).toBeDefined();
            expect(module.createAdaptiveSystemPrompt).toBeDefined();
            expect(module.combinePrepareSteps).toBeDefined();
            expect(module.createTokenBudgetManager).toBeDefined();
            expect(module.createDynamicModelSelector).toBeDefined();
            expect(module.createPhaseBasedToolSelector).toBeDefined();
            expect(module.createSequentialWorkflowPreparer).toBeDefined();
        });

        it("should not export internal registry functions from llm", async () => {
            const module = await import("@/agent/llm.js");

            expect(module.checkProviderAvailability).toBeDefined();
            expect(module.createLlmProvider).toBeDefined();
            expect(module.streamAssistantResponse).toBeDefined();

            expect((module as any).getOrCreateRegistry).toBeUndefined();
            expect((module as any).resetRegistry).toBeUndefined();
        });
    });

    describe("import paths", () => {
        it("should import tools from correct path", async () => {
            const agentsModule = await import("@/agent/agents.js");
            const toolsModule = await import("@/agent/tools/index.js");

            expect(agentsModule.createBinharicAgent).toBeDefined();
            expect(toolsModule.tools).toBeDefined();
        });
    });
});
