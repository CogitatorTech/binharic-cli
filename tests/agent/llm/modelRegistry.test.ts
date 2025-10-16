import { beforeEach, describe, expect, it } from "vitest";
import {
    createModelRegistry,
    getAvailableModels,
    getModelFromRegistry,
    parseModelString,
    validateModelString,
} from "@/agent/llm/modelRegistry.js";
import type { Config } from "@/config.js";

describe("Model Registry Module", () => {
    let mockConfig: Config;
    let registry: ReturnType<typeof createModelRegistry>;

    beforeEach(() => {
        mockConfig = {
            userName: "testuser",
            systemPrompt: "Test system prompt",
            defaultModel: "gpt-5-mini",
            models: [],
            history: { maxItems: null },
        };

        registry = createModelRegistry(mockConfig);
    });

    describe("createModelRegistry", () => {
        it("should create registry with all providers", () => {
            expect(registry).toBeDefined();
            expect(registry.languageModel).toBeDefined();
        });

        it("should support anthropic models", () => {
            const model = registry.languageModel("anthropic/fast");
            expect(model).toBeDefined();
        });

        it("should support openai models", () => {
            const model = registry.languageModel("openai/fast");
            expect(model).toBeDefined();
        });

        it("should support google models", () => {
            const model = registry.languageModel("google/fast");
            expect(model).toBeDefined();
        });

        it("should support ollama models", () => {
            const model = registry.languageModel("ollama/qwen3");
            expect(model).toBeDefined();
        });
    });

    describe("getModelFromRegistry", () => {
        it("should retrieve model by string", () => {
            const model = getModelFromRegistry(registry, "openai/balanced");
            expect(model).toBeDefined();
        });

        it("should throw error for invalid model string", () => {
            expect(() => getModelFromRegistry(registry, "invalid-model")).toThrow(
                "Invalid model string",
            );
        });
    });

    describe("parseModelString", () => {
        it("should parse valid model string", () => {
            const result = parseModelString("anthropic/fast");
            expect(result).toEqual({
                provider: "anthropic",
                model: "fast",
            });
        });

        it("should parse model string with specific version", () => {
            const result = parseModelString("openai/gpt-5");
            expect(result).toEqual({
                provider: "openai",
                model: "gpt-5",
            });
        });

        it("should throw error for invalid format", () => {
            expect(() => parseModelString("invalid")).toThrow("Invalid model string format");
        });

        it("should throw error for too many separators", () => {
            expect(() => parseModelString("provider/model/extra")).toThrow(
                "Invalid model string format",
            );
        });
    });

    describe("getAvailableModels", () => {
        it("should return all available models", () => {
            const models = getAvailableModels(registry);

            expect(models).toHaveProperty("anthropic");
            expect(models).toHaveProperty("openai");
            expect(models).toHaveProperty("google");
            expect(models).toHaveProperty("ollama");
        });

        it("should include model aliases", () => {
            const models = getAvailableModels(registry);

            expect(models.anthropic).toContain("fast");
            expect(models.anthropic).toContain("balanced");
            expect(models.anthropic).toContain("powerful");
            expect(models.anthropic).toContain("reasoning");
        });

        it("should include specific model versions", () => {
            const models = getAvailableModels(registry);

            expect(models.openai).toContain("gpt-5");
            expect(models.openai).toContain("gpt-5-mini");
            expect(models.openai).toContain("gpt-5-nano");
            expect(models.openai).toContain("gpt-4o");
            expect(models.openai).toContain("gpt-o4-mini");
        });

        it("should include google models", () => {
            const models = getAvailableModels(registry);

            expect(models.google).toContain("gemini-2.5-flash");
            expect(models.google).toContain("gemini-2.5-pro");
            expect(models.google).toContain("thinking");
        });

        it("should include ollama models", () => {
            const models = getAvailableModels(registry);

            expect(models.ollama).toContain("qwen3");
            expect(models.ollama).toContain("qwen2.5-coder");
            expect(models.ollama).toContain("llama3.3");
            expect(models.ollama).toContain("deepseek-r1");
        });
    });

    describe("validateModelString", () => {
        it("should validate correct model strings", () => {
            expect(validateModelString("anthropic/fast")).toBe(true);
            expect(validateModelString("openai/gpt-5")).toBe(true);
            expect(validateModelString("google/gemini-2.5-pro")).toBe(true);
        });

        it("should reject invalid model strings", () => {
            expect(validateModelString("invalid")).toBe(false);
            expect(validateModelString("too/many/parts")).toBe(false);
            expect(validateModelString("")).toBe(false);
        });
    });

    describe("Model Aliases", () => {
        it("should support performance tier aliases", () => {
            const fast = registry.languageModel("anthropic/fast");
            const balanced = registry.languageModel("anthropic/balanced");
            const powerful = registry.languageModel("anthropic/powerful");

            expect(fast).toBeDefined();
            expect(balanced).toBeDefined();
            expect(powerful).toBeDefined();
        });

        it("should support reasoning models", () => {
            const anthropicReasoning = registry.languageModel("anthropic/reasoning");
            const openaiReasoning = registry.languageModel("openai/reasoning");

            expect(anthropicReasoning).toBeDefined();
            expect(openaiReasoning).toBeDefined();
        });

        it("should support new GPT-5 models", () => {
            const gpt5 = registry.languageModel("openai/gpt-5");
            const gpt5Mini = registry.languageModel("openai/gpt-5-mini");
            const gpt5Nano = registry.languageModel("openai/gpt-5-nano");

            expect(gpt5).toBeDefined();
            expect(gpt5Mini).toBeDefined();
            expect(gpt5Nano).toBeDefined();
        });

        it("should support new Claude 4 models", () => {
            const claude4 = registry.languageModel("anthropic/claude-4-sonnet");
            const claude45 = registry.languageModel("anthropic/claude-4-5-sonnet");

            expect(claude4).toBeDefined();
            expect(claude45).toBeDefined();
        });

        it("should support new Gemini 2.5 models", () => {
            const geminiPro = registry.languageModel("google/gemini-2.5-pro");
            const geminiFlash = registry.languageModel("google/gemini-2.5-flash");

            expect(geminiPro).toBeDefined();
            expect(geminiFlash).toBeDefined();
        });

        it("should support Qwen3 model", () => {
            const qwen3 = registry.languageModel("ollama/qwen3");
            expect(qwen3).toBeDefined();
        });
    });
});
