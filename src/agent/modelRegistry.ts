import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { createOllama } from "ollama-ai-provider-v2";
import {
    createProviderRegistry,
    customProvider,
    defaultSettingsMiddleware,
    wrapLanguageModel,
} from "ai";
import type { Config } from "@/config.js";
import logger from "@/logger.js";

export function createModelRegistry(_config: Config) {
    const anthropicProvider = customProvider({
        languageModels: {
            fast: anthropic("claude-3-5-haiku-20241022"),
            balanced: anthropic("claude-4-sonnet-20250514"),
            powerful: anthropic("claude-4-5-sonnet-20250514"),
            "claude-4-sonnet": anthropic("claude-4-sonnet-20250514"),
            "claude-4-5-sonnet": anthropic("claude-4-5-sonnet-20250514"),
            "haiku-3.5": anthropic("claude-3-5-haiku-20241022"),
            "sonnet-3.5": anthropic("claude-3-5-sonnet-20241022"),
            "sonnet-3.7": anthropic("claude-3-7-sonnet-20250219"),
            "opus-4": anthropic("claude-opus-4-20250514"),
            reasoning: wrapLanguageModel({
                model: anthropic("claude-4-5-sonnet-20250514"),
                middleware: defaultSettingsMiddleware({
                    settings: {
                        maxOutputTokens: 100000,
                        providerOptions: {
                            anthropic: {
                                thinking: {
                                    type: "enabled",
                                    budgetTokens: 32000,
                                },
                            },
                        },
                    },
                }),
            }),
        },
        fallbackProvider: anthropic,
    });

    const openaiProvider = customProvider({
        languageModels: {
            fast: openai("gpt-5-nano"),
            balanced: openai("gpt-5-mini"),
            powerful: openai("gpt-5"),
            "gpt-5-nano": openai("gpt-5-nano"),
            "gpt-5-mini": openai("gpt-5-mini"),
            "gpt-5": openai("gpt-5"),
            "gpt-4o": openai("gpt-4o"),
            "gpt-o4-mini": openai("gpt-o4-mini"),
            "gpt-4o-mini": openai("gpt-4o-mini"),
            o1: openai("o1"),
            "o1-mini": openai("o1-mini"),
            "o3-mini": openai("o3-mini"),
            reasoning: wrapLanguageModel({
                model: openai("gpt-5"),
                middleware: defaultSettingsMiddleware({
                    settings: {
                        maxOutputTokens: 100000,
                    },
                }),
            }),
        },
        fallbackProvider: openai,
    });

    const googleProvider = customProvider({
        languageModels: {
            fast: google("gemini-2.5-flash"),
            balanced: google("gemini-2.5-pro"),
            powerful: google("gemini-2.5-pro"),
            "gemini-2.5-flash": google("gemini-2.5-flash"),
            "gemini-2.5-pro": google("gemini-2.5-pro"),
            "gemini-1.5-flash": google("gemini-1.5-flash"),
            "gemini-1.5-pro": google("gemini-1.5-pro"),
            "gemini-2.0-flash": google("gemini-2.0-flash-exp"),
            thinking: wrapLanguageModel({
                model: google("gemini-2.5-pro"),
                middleware: defaultSettingsMiddleware({
                    settings: {
                        maxOutputTokens: 8192,
                    },
                }),
            }),
        },
        fallbackProvider: google,
    });

    const ollamaProvider = customProvider({
        languageModels: {
            qwen3: createOllama()("qwen3:8b"),
            "qwen2.5-coder": createOllama()("qwen2.5-coder:32b"),
            "llama3.3": createOllama()("llama3.3:70b"),
            "deepseek-r1": createOllama()("deepseek-r1:70b"),
            phi4: createOllama()("phi4:14b"),
        },
    });

    const registry = createProviderRegistry(
        {
            anthropic: anthropicProvider,
            openai: openaiProvider,
            google: googleProvider,
            ollama: ollamaProvider,
        },
        { separator: "/" },
    );

    logger.info("Model registry created", {
        providers: ["anthropic", "openai", "google", "ollama"],
        separator: "/",
    });

    return registry;
}

export function getModelFromRegistry(
    registry: ReturnType<typeof createModelRegistry>,
    modelString: string,
) {
    try {
        const model = registry.languageModel(
            modelString as Parameters<typeof registry.languageModel>[0],
        );
        logger.debug("Model retrieved from registry", { modelString });
        return model;
    } catch (error) {
        logger.error("Failed to get model from registry", {
            modelString,
            error: error instanceof Error ? error.message : String(error),
        });
        throw new Error(`Invalid model string: ${modelString}`);
    }
}

export function parseModelString(modelString: string): {
    provider: string;
    model: string;
} {
    const parts = modelString.split("/");
    if (parts.length !== 2) {
        throw new Error(
            `Invalid model string format: ${modelString}. Expected format: provider/model`,
        );
    }

    return {
        provider: parts[0],
        model: parts[1],
    };
}

export function getAvailableModels(
    _registry: ReturnType<typeof createModelRegistry>,
): Record<string, string[]> {
    return {
        anthropic: [
            "fast",
            "balanced",
            "powerful",
            "reasoning",
            "claude-4-sonnet",
            "claude-4-5-sonnet",
            "haiku-3.5",
            "sonnet-3.5",
            "sonnet-3.7",
            "opus-4",
        ],
        openai: [
            "fast",
            "balanced",
            "powerful",
            "reasoning",
            "gpt-5-nano",
            "gpt-5-mini",
            "gpt-5",
            "gpt-4o",
            "gpt-o4-mini",
            "gpt-4o-mini",
            "o1",
            "o1-mini",
            "o3-mini",
        ],
        google: [
            "fast",
            "balanced",
            "powerful",
            "thinking",
            "gemini-2.5-flash",
            "gemini-2.5-pro",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-2.0-flash",
        ],
        ollama: ["qwen3", "qwen2.5-coder", "llama3.3", "deepseek-r1", "phi4"],
    };
}

export function validateModelString(modelString: string): boolean {
    try {
        parseModelString(modelString);
        return true;
    } catch {
        return false;
    }
}
