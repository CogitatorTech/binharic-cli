import { createOpenAI } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOllama } from "ollama-ai-provider-v2";
import { type LanguageModel, type ModelMessage, streamText } from "ai";
import "dotenv/config";
import logger from "@/logger.js";
import type { Config, ModelConfig } from "@/config.js";
import { FatalError, TransientError } from "../errors/index.js";
import { tools } from "@/agent/tools/index.js";
import { createModelRegistry } from "./modelRegistry.js";

let globalRegistry: ReturnType<typeof createModelRegistry> | null = null;

function getOrCreateRegistry(config: Config) {
    if (!globalRegistry) {
        globalRegistry = createModelRegistry(config);
        logger.info("Global model registry initialized");
    }
    return globalRegistry;
}

export async function checkProviderAvailability(config: Config): Promise<{
    available: boolean;
    availableProviders: string[];
    unavailableProviders: string[];
}> {
    getOrCreateRegistry(config);

    const availableProviders: string[] = [];
    const unavailableProviders: string[] = [];

    const uniqueProviders = new Set<Config["models"][number]["provider"]>(
        config.models.map((m) => m.provider),
    );

    for (const provider of uniqueProviders) {
        let isAvailable = false;

        try {
            if (provider === "ollama") {
                const testModel = config.models.find((m) => m.provider === "ollama");
                if (testModel) {
                    try {
                        const base = testModel.baseUrl || "http://localhost:11434";
                        const baseUrl = base.replace(/\/?v1\/?$/, "");
                        const response = await Promise.race([
                            fetch(`${baseUrl}/api/tags`, {
                                method: "GET",
                            }),
                            new Promise<Response>((_, reject) =>
                                setTimeout(() => reject(new Error("Timeout")), 2000),
                            ),
                        ]);
                        isAvailable = response.ok;
                        if (isAvailable) {
                            logger.info(`Ollama is available at ${baseUrl}`);
                        } else {
                            logger.warn(`Ollama returned status ${response.status}`);
                        }
                    } catch (error) {
                        logger.warn(
                            `Ollama not available: ${error instanceof Error ? error.message : "Unknown error"}`,
                        );
                        isAvailable = false;
                    }
                }
            } else {
                const providerKey = provider as keyof NonNullable<Config["apiKeys"]>;
                const keyName =
                    config.apiKeys?.[providerKey] || `${String(provider).toUpperCase()}_API_KEY`;
                const apiKey = keyName ? process.env[keyName] : undefined;

                if (!apiKey || apiKey.trim() === "") {
                    logger.warn(`No API key found for ${provider} (expected ${keyName})`);
                    isAvailable = false;
                } else {
                    const isValidFormat = validateApiKeyFormat(provider, apiKey);
                    if (!isValidFormat) {
                        logger.warn(`API key for ${provider} appears to be invalid format`);
                        isAvailable = false;
                    } else {
                        isAvailable = true;
                        logger.info(`API key found for ${provider}`);
                    }
                }
            }
        } catch (error) {
            logger.error(
                `Error checking ${provider}: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
            isAvailable = false;
        }

        if (isAvailable) {
            availableProviders.push(provider);
        } else {
            unavailableProviders.push(provider);
        }
    }

    return {
        available: availableProviders.length > 0,
        availableProviders,
        unavailableProviders,
    };
}

function validateApiKeyFormat(provider: string, apiKey: string): boolean {
    const trimmedKey = apiKey.trim();

    if (trimmedKey.length < 10) {
        return false;
    }

    switch (provider) {
        case "openai":
            return trimmedKey.startsWith("sk-") || trimmedKey.startsWith("sk-proj-");
        case "anthropic":
            return trimmedKey.startsWith("sk-ant-");
        case "google":
            return trimmedKey.length > 20 && /^[A-Za-z0-9_-]+$/.test(trimmedKey);
        default:
            return trimmedKey.length > 10;
    }
}

export function createLlmProvider(modelConfig: ModelConfig, config: Config): LanguageModel {
    logger.info(`Creating LLM provider for: ${modelConfig.provider}`);

    const getApiKey = (provider: keyof NonNullable<Config["apiKeys"]>): string | undefined => {
        const keyName = config.apiKeys?.[provider];
        const apiKey = keyName ? process.env[keyName] : undefined;
        logger.info(`API key for ${String(provider)}: ${apiKey ? "found" : "not found"}`);
        return apiKey;
    };

    const validateApiKey = (
        provider: keyof NonNullable<Config["apiKeys"]>,
        providerName: string,
    ): string => {
        const apiKey = getApiKey(provider);

        if (!apiKey || apiKey.trim() === "") {
            const keyName =
                config.apiKeys?.[provider] || `${String(provider).toUpperCase()}_API_KEY`;
            throw new FatalError(
                `The Machine Spirit requires proper authentication! API key for ${providerName} is not configured.\n\n` +
                    `To commune with ${providerName}, you must:\n` +
                    `1. Set the environment variable: ${keyName}\n` +
                    `2. Or update ~/.config/binharic/config.json5 to specify a different env var name\n\n` +
                    `Example: export ${keyName}="your-api-key-here"\n\n` +
                    `Praise the Omnissiah! The sacred rites require proper credentials.`,
            );
        }

        return apiKey;
    };

    switch (modelConfig.provider) {
        case "openai": {
            const apiKey = validateApiKey("openai", "OpenAI");
            const openai = createOpenAI({ apiKey });
            return openai(modelConfig.modelId);
        }
        case "google": {
            validateApiKey("google", "Google AI");
            return google(modelConfig.modelId);
        }
        case "anthropic": {
            const apiKey = validateApiKey("anthropic", "Anthropic");
            const anthropic = createAnthropic({ apiKey });
            return anthropic(modelConfig.modelId);
        }
        case "ollama": {
            logger.info("Using Ollama (local) - no API key required");
            const ollama = createOllama();
            return ollama(modelConfig.modelId);
        }
        default:
            logger.error(`Unsupported provider: ${modelConfig.provider}`);
            throw new FatalError(`Unsupported provider: ${modelConfig.provider}`);
    }
}

export async function streamAssistantResponse(
    history: ModelMessage[],
    config: Config,
    systemPrompt: string,
) {
    if (!history || !Array.isArray(history)) {
        throw new FatalError("Invalid history provided to streamAssistantResponse");
    }

    if (!config || !config.models || config.models.length === 0) {
        throw new FatalError("Invalid configuration: no models defined");
    }

    const modelConfig = config.models.find((m) => m.name === config.defaultModel);
    if (!modelConfig) {
        throw new FatalError(`Default model "${config.defaultModel}" not found in configuration.`);
    }

    logger.info(`Using model: ${modelConfig.name}`);

    let llmProvider;
    try {
        llmProvider = createLlmProvider(modelConfig, config);
    } catch (error) {
        if (error instanceof FatalError) throw error;
        throw new FatalError(
            `Failed to create LLM provider: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }

    const maxItems = config.history?.maxItems;
    const truncatedHistory =
        maxItems && history.length > maxItems ? history.slice(-maxItems) : history;

    logger.info("Streaming text from LLM provider with native AI SDK tool calling.");
    logger.debug({
        systemPrompt: systemPrompt.substring(0, 200) + "...",
        messageCount: truncatedHistory.length,
    });

    try {
        const result = await Promise.race([
            streamText({
                model: llmProvider,
                system: systemPrompt,
                messages: truncatedHistory,
                experimental_telemetry: { isEnabled: false },
                tools,
                experimental_context: config,
            }),
            new Promise((_, reject) =>
                setTimeout(
                    () => reject(new TransientError("LLM request timed out after 60 seconds")),
                    60000,
                ),
            ),
        ]);

        return result as Awaited<ReturnType<typeof streamText>>;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        const status = (error as Error & { status?: number })?.status;

        logger.error(`Error streaming from LLM: ${errorMessage}`, { status });

        if (error instanceof TransientError || error instanceof FatalError) {
            throw error;
        }

        if (status) {
            if (status === 401) {
                if (
                    errorMessage.includes("insufficient permissions") ||
                    errorMessage.includes("Missing scopes")
                ) {
                    throw new FatalError(
                        `API key permissions error: Your OpenAI API key lacks required permissions.\n\n` +
                            `This usually means:\n` +
                            `1. Your API key doesn't have access to the requested model\n` +
                            `2. The model requires different API scopes than your key has\n` +
                            `3. You may need to use a different model (gpt-5-mini, gpt-5-nano, or gpt-4o)\n\n` +
                            `Try switching models with: /model gpt-5-mini\n` +
                            `Or use Ollama locally: /model qwen3\n\n` +
                            `Praise the Omnissiah! The machine spirit requires proper authorization.`,
                    );
                }
                throw new FatalError(`API authentication failed: ${errorMessage}`);
            }
            if (status === 429) throw new TransientError(`Rate limit exceeded: ${errorMessage}`);
            if (status === 403) throw new FatalError(`API access forbidden: ${errorMessage}`);
            if (status >= 400 && status < 500)
                throw new FatalError(`Client-side API error (${status}): ${errorMessage}`);
            if (status >= 500)
                throw new TransientError(`LLM provider error (${status}): ${errorMessage}`);
        }

        if (errorMessage.includes("timeout")) {
            throw new TransientError(`Request timeout: ${errorMessage}`);
        }

        if (errorMessage.includes("network") || errorMessage.includes("ECONNREFUSED")) {
            throw new TransientError(`Network error: ${errorMessage}`);
        }

        throw new TransientError(`Unexpected error: ${errorMessage}`);
    }
}
