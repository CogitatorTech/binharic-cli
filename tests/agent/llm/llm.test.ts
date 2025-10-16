import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLlmProvider, streamAssistantResponse } from "@/agent/llm";
import type { Config, ModelConfig } from "@/config";
import { createOllama } from "ollama-ai-provider-v2";
import { createOpenAI } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { FatalError, TransientError } from "@/agent/errors/index";
import { streamText } from "ai";

vi.mock("ollama-ai-provider-v2", () => ({
    createOllama: vi.fn(() => vi.fn()),
}));

vi.mock("@ai-sdk/openai", () => ({
    createOpenAI: vi.fn(() => vi.fn()),
}));

vi.mock("@ai-sdk/google", () => ({
    google: vi.fn(() => vi.fn()),
}));

vi.mock("@ai-sdk/anthropic", () => ({
    createAnthropic: vi.fn(() => vi.fn()),
}));

vi.mock("ai", async (importOriginal) => {
    const original = await importOriginal<typeof import("ai")>();
    return {
        ...original,
        streamText: vi.fn(),
    };
});

describe("createLlmProvider", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        // Mock environment variables for testing
        process.env = {
            ...originalEnv,
            OPENAI_API_KEY: "test-openai-key",
            GOOGLE_API_KEY: "test-google-key",
            ANTHROPIC_API_KEY: "test-anthropic-key",
        };
    });

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv;
    });

    it("should create an ollama provider", () => {
        const modelConfig: ModelConfig = {
            name: "test-model",
            provider: "ollama",
            modelId: "test-model-id",
            context: 32768,
        };
        const config: Config = {
            defaultModel: "test-model",
            models: [modelConfig],
        };

        createLlmProvider(modelConfig, config);

        expect(createOllama).toHaveBeenCalled();
    });

    it("should create an openai provider", () => {
        const modelConfig: ModelConfig = {
            name: "test-model",
            provider: "openai",
            modelId: "test-model-id",
            context: 128000,
        };
        const config: Config = {
            defaultModel: "test-model",
            models: [modelConfig],
            apiKeys: {
                openai: "OPENAI_API_KEY",
            },
        };

        createLlmProvider(modelConfig, config);

        expect(createOpenAI).toHaveBeenCalled();
    });

    it("should create a google provider", () => {
        const modelConfig: ModelConfig = {
            name: "test-model",
            provider: "google",
            modelId: "test-model-id",
            context: 1000000,
        };
        const config: Config = {
            defaultModel: "test-model",
            models: [modelConfig],
            apiKeys: {
                google: "GOOGLE_API_KEY",
            },
        };

        createLlmProvider(modelConfig, config);

        expect(google).toHaveBeenCalledWith("test-model-id");
    });

    it("should create an anthropic provider", () => {
        const modelConfig: ModelConfig = {
            name: "test-model",
            provider: "anthropic",
            modelId: "test-model-id",
            context: 200000,
        };
        const config: Config = {
            defaultModel: "test-model",
            models: [modelConfig],
            apiKeys: {
                anthropic: "ANTHROPIC_API_KEY",
            },
        };

        createLlmProvider(modelConfig, config);

        expect(createAnthropic).toHaveBeenCalled();
    });

    it("should throw an error for unsupported providers", () => {
        const modelConfig: ModelConfig = {
            name: "test-model",
            provider: "unsupported" as any,
            modelId: "test-model-id",
            context: 32768,
        };
        const config: Config = {
            defaultModel: "test-model",
            models: [modelConfig],
        };

        expect(() => createLlmProvider(modelConfig, config)).toThrow(FatalError);
    });
});

describe("streamAssistantResponse", () => {
    const config: Config = {
        defaultModel: "test-model",
        models: [
            {
                name: "test-model",
                provider: "ollama",
                modelId: "test-model-id",
                context: 32768,
            },
        ],
        history: {
            maxItems: 2,
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should throw a FatalError if the default model is not found", async () => {
        const invalidConfig = { ...config, defaultModel: "not-found" };
        await expect(streamAssistantResponse([], invalidConfig, "test prompt")).rejects.toThrow(
            FatalError,
        );
    });

    it("should truncate the history based on maxItems", async () => {
        const history = [
            { role: "user" as const, content: "1" },
            { role: "user" as const, content: "2" },
            { role: "user" as const, content: "3" },
        ];
        await streamAssistantResponse(history, config, "test prompt");
        const passedHistory = vi.mocked(streamText).mock.calls[0][0]?.messages;
        expect(passedHistory).toHaveLength(2);
        expect(passedHistory?.[0].content).toBe("2");
        expect(passedHistory?.[1].content).toBe("3");
    });

    it("should call streamText with the correct parameters", async () => {
        const history = [{ role: "user" as const, content: "hello" }];
        await streamAssistantResponse(history, config, "test prompt");

        expect(streamText).toHaveBeenCalledWith(
            expect.objectContaining({
                messages: expect.arrayContaining([expect.objectContaining({ content: "hello" })]),
            }),
        );
    });

    it("should throw a FatalError for 401 status", async () => {
        const error = new Error("Auth error") as Error & { status: number };
        error.status = 401;
        vi.mocked(streamText).mockRejectedValue(error);

        await expect(streamAssistantResponse([], config, "test prompt")).rejects.toThrow(
            FatalError,
        );
    });

    it("should throw a TransientError for 500 status", async () => {
        const error = new Error("Server error") as Error & { status: number };
        error.status = 500;
        vi.mocked(streamText).mockRejectedValue(error);

        await expect(streamAssistantResponse([], config, "test prompt")).rejects.toThrow(
            TransientError,
        );
    });

    it("should throw a TransientError for other errors", async () => {
        const error = new Error("Network error");
        vi.mocked(streamText).mockRejectedValue(error);

        await expect(streamAssistantResponse([], config, "test prompt")).rejects.toThrow(
            TransientError,
        );
    });
});
