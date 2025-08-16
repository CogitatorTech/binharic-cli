import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLlmProvider, streamAssistantResponse } from "@/agent/llm";
import type { Config, ModelConfig } from "@/config";
import { createOllama } from "ollama-ai-provider-v2";
import { createOpenAI } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { FatalError, TransientError } from "@/agent/errors";
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
    it("should create an ollama provider", () => {
        const modelConfig: ModelConfig = {
            name: "test-model",
            provider: "ollama",
            modelId: "test-model-id",
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
        };
        const config: Config = {
            defaultModel: "test-model",
            models: [modelConfig],
        };

        createLlmProvider(modelConfig, config);

        expect(createOpenAI).toHaveBeenCalled();
    });

    it("should create a google provider", () => {
        const modelConfig: ModelConfig = {
            name: "test-model",
            provider: "google",
            modelId: "test-model-id",
        };
        const config: Config = {
            defaultModel: "test-model",
            models: [modelConfig],
        };

        createLlmProvider(modelConfig, config);

        expect(google).toHaveBeenCalled();
    });

    it("should create an anthropic provider", () => {
        const modelConfig: ModelConfig = {
            name: "test-model",
            provider: "anthropic",
            modelId: "test-model-id",
        };
        const config: Config = {
            defaultModel: "test-model",
            models: [modelConfig],
        };

        createLlmProvider(modelConfig, config);

        expect(createAnthropic).toHaveBeenCalled();
    });

    it("should throw a FatalError for an unsupported provider", () => {
        const modelConfig: ModelConfig = {
            name: "test-model",
            // @ts-expect-error - testing unsupported provider
            provider: "unsupported",
            modelId: "test-model-id",
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
        await expect(streamAssistantResponse([], invalidConfig)).rejects.toThrow(FatalError);
    });

    it("should truncate the history based on maxItems", async () => {
        const history = [
            { id: "1", role: "user", content: "1" },
            { id: "2", role: "user", content: "2" },
            { id: "3", role: "user", content: "3" },
        ];
        await streamAssistantResponse(history, config);
        const passedHistory = vi.mocked(streamText).mock.calls[0][0]?.messages;
        expect(passedHistory).toHaveLength(2);
        expect(passedHistory?.[0].content).toBe("2");
        expect(passedHistory?.[1].content).toBe("3");
    });

    it("should call streamText with the correct parameters", async () => {
        const history = [{ id: "1", role: "user", content: "hello" }];
        await streamAssistantResponse(history, config);

        expect(streamText).toHaveBeenCalledWith(
            expect.objectContaining({
                // @ts-expect-error - private property access
                messages: expect.arrayContaining([expect.objectContaining({ content: "hello" })]),
            }),
        );
    });

    it("should throw a FatalError for 401 status", async () => {
        const error = new Error("Auth error") as Error & { status: number };
        error.status = 401;
        vi.mocked(streamText).mockRejectedValue(error);

        await expect(streamAssistantResponse([], config)).rejects.toThrow(FatalError);
    });

    it("should throw a TransientError for 500 status", async () => {
        const error = new Error("Server error") as Error & { status: number };
        error.status = 500;
        vi.mocked(streamText).mockRejectedValue(error);

        await expect(streamAssistantResponse([], config)).rejects.toThrow(TransientError);
    });

    it("should throw a TransientError for other errors", async () => {
        const error = new Error("Network error");
        vi.mocked(streamText).mockRejectedValue(error);

        await expect(streamAssistantResponse([], config)).rejects.toThrow(TransientError);
    });
});
