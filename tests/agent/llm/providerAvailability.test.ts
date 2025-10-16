import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkProviderAvailability } from "../../../src/agent/llm/provider.js";
import type { Config } from "../../../src/config.js";

describe("Provider Availability Check", () => {
    let mockConfig: Config;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
        mockConfig = {
            userName: "testuser",
            systemPrompt: "test",
            defaultModel: "test-model",
            models: [
                { name: "gpt-4", provider: "openai", modelId: "gpt-4", context: 8000 },
                { name: "claude", provider: "anthropic", modelId: "claude-3", context: 100000 },
                { name: "gemini", provider: "google", modelId: "gemini-pro", context: 32000 },
            ],
            history: { maxItems: null },
            apiKeys: {
                openai: "OPENAI_API_KEY",
                google: "GOOGLE_API_KEY",
                anthropic: "ANTHROPIC_API_KEY",
            },
        };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it("should detect available providers with API keys", async () => {
        process.env.OPENAI_API_KEY = "sk-test-key";
        process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";
        delete process.env.GOOGLE_API_KEY;

        const result = await checkProviderAvailability(mockConfig);

        expect(result.available).toBe(true);
        expect(result.availableProviders).toContain("openai");
        expect(result.availableProviders).toContain("anthropic");
        expect(result.unavailableProviders).toContain("google");
    });

    it("should return unavailable when no providers have keys", async () => {
        delete process.env.OPENAI_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;
        delete process.env.GOOGLE_API_KEY;

        const result = await checkProviderAvailability(mockConfig);

        expect(result.available).toBe(false);
        expect(result.availableProviders).toHaveLength(0);
        expect(result.unavailableProviders.length).toBeGreaterThan(0);
    });

    it("should handle mixed availability", async () => {
        process.env.OPENAI_API_KEY = "sk-test-key";
        delete process.env.ANTHROPIC_API_KEY;
        delete process.env.GOOGLE_API_KEY;

        const result = await checkProviderAvailability(mockConfig);

        expect(result.available).toBe(true);
        expect(result.availableProviders).toEqual(["openai"]);
        expect(result.unavailableProviders).toContain("anthropic");
        expect(result.unavailableProviders).toContain("google");
    });

    it("should handle empty API keys as unavailable", async () => {
        process.env.OPENAI_API_KEY = "";
        process.env.ANTHROPIC_API_KEY = "   ";
        delete process.env.GOOGLE_API_KEY;

        const result = await checkProviderAvailability(mockConfig);

        expect(result.available).toBe(false);
        expect(result.availableProviders).toHaveLength(0);
    });

    it("should check unique providers only once", async () => {
        process.env.OPENAI_API_KEY = "sk-test-key";

        mockConfig.models = [
            { name: "gpt-4", provider: "openai", modelId: "gpt-4", context: 8000 },
            { name: "gpt-3.5", provider: "openai", modelId: "gpt-3.5-turbo", context: 4000 },
        ];

        const result = await checkProviderAvailability(mockConfig);

        expect(result.available).toBe(true);
        expect(result.availableProviders).toEqual(["openai"]);
    });

    it("should handle ollama provider separately", async () => {
        mockConfig.models = [
            {
                name: "qwen",
                provider: "ollama",
                modelId: "qwen3:8b",
                context: 32768,
                baseUrl: "http://localhost:11434",
            },
        ];

        const result = await checkProviderAvailability(mockConfig);

        expect(result).toHaveProperty("available");
        expect(result).toHaveProperty("availableProviders");
        expect(result).toHaveProperty("unavailableProviders");
    });

    it("should reject invalid API key formats", async () => {
        process.env.OPENAI_API_KEY = "invalid-key-format";
        delete process.env.ANTHROPIC_API_KEY;
        delete process.env.GOOGLE_API_KEY;

        const result = await checkProviderAvailability(mockConfig);

        expect(result.available).toBe(false);
        expect(result.availableProviders).toHaveLength(0);
        expect(result.unavailableProviders).toContain("openai");
    });

    it("should accept valid OpenAI key formats", async () => {
        process.env.OPENAI_API_KEY = "sk-proj-test123456789";
        mockConfig.models = [
            { name: "gpt-4", provider: "openai", modelId: "gpt-4", context: 8000 },
        ];

        const result = await checkProviderAvailability(mockConfig);

        expect(result.available).toBe(true);
        expect(result.availableProviders).toContain("openai");
    });

    it("should accept valid Anthropic key formats", async () => {
        process.env.ANTHROPIC_API_KEY = "sk-ant-test123456789";
        mockConfig.models = [
            { name: "claude", provider: "anthropic", modelId: "claude-3", context: 100000 },
        ];

        const result = await checkProviderAvailability(mockConfig);

        expect(result.available).toBe(true);
        expect(result.availableProviders).toContain("anthropic");
    });

    it("should handle custom API key names", async () => {
        process.env.MY_CUSTOM_OPENAI_KEY = "sk-test-key";
        mockConfig.apiKeys = {
            openai: "MY_CUSTOM_OPENAI_KEY",
            google: "GOOGLE_API_KEY",
            anthropic: "ANTHROPIC_API_KEY",
        };

        const result = await checkProviderAvailability(mockConfig);

        expect(result.available).toBe(true);
        expect(result.availableProviders).toContain("openai");
    });
});
