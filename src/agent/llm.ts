import { createOpenAI } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOllama } from "ollama-ai-provider-v2";
import { type LanguageModel, type ModelMessage, streamText } from "ai";
import "dotenv/config";
import logger from "@/logger.js";
import type { Config, ModelConfig } from "@/config.js";
import { FatalError, TransientError } from "./errors.js";
import { toolModules } from "./tools/definitions/index.js";

export function createLlmProvider(modelConfig: ModelConfig, config: Config): LanguageModel {
    logger.info(`Creating LLM provider for: ${modelConfig.provider}`);
    const getApiKey = (provider: keyof NonNullable<Config["apiKeys"]>): string | undefined => {
        const keyName = config.apiKeys?.[provider];
        const apiKey = keyName ? process.env[keyName] : undefined;
        logger.info(`API key for ${provider}: ${apiKey ? "found" : "not found"}`);
        return apiKey;
    };
    switch (modelConfig.provider) {
        case "openai": {
            const openai = createOpenAI({ apiKey: getApiKey("openai") });
            return openai(modelConfig.modelId);
        }
        case "google": {
            return google(modelConfig.modelId);
        }
        case "anthropic": {
            const anthropic = createAnthropic({ apiKey: getApiKey("anthropic") });
            return anthropic(modelConfig.modelId);
        }
        case "ollama": {
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
    const modelConfig = config.models.find((m) => m.name === config.defaultModel);
    if (!modelConfig) {
        throw new FatalError(`Default model "${config.defaultModel}" not found in configuration.`);
    }
    logger.info(`Using model: ${modelConfig.name}`);
    const llmProvider = createLlmProvider(modelConfig, config);
    const maxItems = config.history?.maxItems;
    const truncatedHistory =
        maxItems && history.length > maxItems ? history.slice(-maxItems) : history;
    logger.info("Streaming text from LLM provider.");
    logger.debug({ systemPrompt, messages: truncatedHistory });

    try {
        return await streamText({
            model: llmProvider,
            system: systemPrompt,
            messages: truncatedHistory,
            experimental_telemetry: { isEnabled: false },
            tools: Object.fromEntries(
                Object.values(toolModules).map((module) => [
                    module.schema.shape.name.value,
                    // CORRECTED: Manually creating this object avoids the complex type error
                    // from the `tool()` helper function.
                    {
                        description: module.description,
                        inputSchema: module.schema.shape.arguments,
                    },
                ]),
            ),
        });
    } catch (error) {
        // ... (error handling remains the same) ...
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        const status = (error as Error & { status?: number })?.status;
        logger.error(`Error streaming from LLM: ${errorMessage}`, { status });
        if (status) {
            if (status === 401) throw new FatalError(`API authentication failed: ${errorMessage}`);
            if (status === 429) throw new TransientError(`Rate limit exceeded: ${errorMessage}`);
            if (status >= 400 && status < 500)
                throw new FatalError(`Client-side API error (${status}): ${errorMessage}`);
            if (status >= 500)
                throw new TransientError(`LLM provider error (${status}): ${errorMessage}`);
        }
        throw new TransientError(`Network or unknown error: ${errorMessage}`);
    }
}
