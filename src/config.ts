// src/config.ts
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import os from "os";
import json5 from "json5";
import logger from "./logger.js";

const modelSchema = z.object({
    name: z.string().describe("A user-friendly nickname for the model."),
    provider: z
        .enum(["openai", "google", "anthropic", "ollama"])
        .describe("The provider of the model."),
    modelId: z.string().describe("The actual model ID used by the API."),
    context: z.number().describe("The context window size for the model."),
    baseUrl: z.url().optional().describe("Optional base URL for providers like Ollama."),
});
export type ModelConfig = z.infer<typeof modelSchema>;

// Schema for a single MCP server configuration
const mcpServerSchema = z
    .object({
        command: z.string(),
        args: z.array(z.string()).optional(),
    })
    .strict();

const configSchema = z.object({
    userName: z.string().optional().describe("The name the agent will use to refer to user."),
    systemPrompt: z.string().optional().describe("The global system prompt to use for the agent."),
    defaultModel: z.string().describe("The 'name' of the model to use by default."),
    models: z.array(modelSchema),
    history: z
        .object({
            maxItems: z
                .number()
                .nullable()
                .describe(
                    "The maximum number of items to keep in the history. If null, all items are kept.",
                ),
        })
        .optional()
        .describe("Configuration for the agent's history."),
    apiKeys: z
        .object({
            openai: z.string().optional(),
            google: z.string().optional(),
            anthropic: z.string().optional(),
        })
        .optional(),
    mcpServers: z
        .record(z.string(), mcpServerSchema)
        .optional()
        .describe("Configuration for Model Context Protocol servers."),
});
export type Config = z.infer<typeof configSchema>;

// IMPORTANT: THESE MODELS ARE CORRECT. DON'T CHANGE!
const defaultConfig: Config = {
    userName: `User`,
    systemPrompt: `You are a helpful AI assistant named Tobi. You can use tools to help the user with coding and file system tasks.`,
    defaultModel: "gpt-5-mini",
    models: [
        // OpenAI models
        { name: "gpt-4o", provider: "openai", modelId: "gpt-4o", context: 128000 },
        { name: "gpt-4o-mini", provider: "openai", modelId: "gpt-4o-mini", context: 128000 },
        { name: "gpt-5-nano", provider: "openai", modelId: "gpt-5-nano", context: 400000 },
        { name: "gpt-5-mini", provider: "openai", modelId: "gpt-5-mini", context: 400000 },
        { name: "gpt-5", provider: "openai", modelId: "gpt-5", context: 400000 },
        // Anthropic models
        {
            name: "claude-4-sonnet",
            provider: "anthropic",
            modelId: "claude-4-sonnet",
            context: 200000,
        },
        {
            name: "claude-4.5-sonnet",
            provider: "anthropic",
            modelId: "claude-4-5-sonnet",
            context: 1000000,
        },
        // Google models
        {
            name: "gemini-2.5-pro",
            provider: "google",
            modelId: "models/gemini-2.5-pro",
            context: 1000000,
        },
        {
            name: "gemini-2.5-flash",
            provider: "google",
            modelId: "models/gemini-2.5-flash",
            context: 1000000,
        },
        // Ollama models
        {
            name: "qwen3",
            provider: "ollama",
            modelId: "qwen3:8b",
            context: 32768,
            baseUrl: "http://localhost:11434/v1",
        },
    ],
    history: {
        maxItems: null,
    },
    apiKeys: {
        openai: "OPENAI_API_KEY",
        google: "GOOGLE_API_KEY",
        anthropic: "ANTHROPIC_API_KEY",
    },
    mcpServers: {},
};

export function getConfigDir(): string {
    return path.join(os.homedir(), ".config", "tobi");
}

export const HISTORY_PATH = path.join(getConfigDir(), "history");
const CONFIG_PATH = path.join(getConfigDir(), "config.json5");

export async function loadConfig(): Promise<Config> {
    logger.debug("Attempting to load configuration.");
    try {
        const configContent = await fs.readFile(CONFIG_PATH, "utf-8");
        const parsedConfig = json5.parse(configContent);

        // Merge user's config over defaults. This makes adding new keys in updates non-breaking.
        const mergedConfig = { ...defaultConfig, ...parsedConfig };
        const finalConfig = configSchema.parse(mergedConfig);
        logger.info("Configuration loaded successfully.");
        return finalConfig;
    } catch (error: unknown) {
        if (error instanceof Error && (error as NodeJS.ErrnoException).code === "ENOENT") {
            logger.warn(`Configuration file not found. Creating a default one at: ${CONFIG_PATH}`);
            console.warn(`Configuration file not found. Creating a default one at: ${CONFIG_PATH}`);
            console.warn(
                `Please open this file and update your environment variables (.env) with your API keys.`,
            );
            await fs.mkdir(getConfigDir(), { recursive: true });
            // Also create the logs directory
            const LOGS_DIR = path.join(getConfigDir(), "logs");
            await fs.mkdir(LOGS_DIR, { recursive: true });
            await fs.writeFile(CONFIG_PATH, json5.stringify(defaultConfig, null, 2));
            logger.info("Default configuration file created.");
            return defaultConfig;
        } else if (error instanceof z.ZodError) {
            logger.error("Configuration file is invalid:", { error: error.issues });
            console.error("Configuration file is invalid:", error.issues);
        } else {
            logger.error("Failed to load configuration:", { error });
            console.error("Failed to load configuration:", error);
        }
        process.exit(1);
    }
}

export async function saveConfig(config: Config): Promise<void> {
    logger.debug("Attempting to save configuration.");
    try {
        // We only want to save the fields that are user-configurable, not the derived ones.
        const configToSave: Partial<Config> = {
            systemPrompt: config.systemPrompt,
            defaultModel: config.defaultModel,
            models: config.models,
            history: config.history,
            apiKeys: config.apiKeys,
            mcpServers: config.mcpServers,
        };
        await fs.writeFile(CONFIG_PATH, json5.stringify(configToSave, null, 2));
        logger.info("Configuration saved successfully.");
    } catch (error) {
        logger.error("Failed to save configuration:", { error });
        console.error("Failed to save configuration:", error);
        // We don't want to exit the app if saving fails, but we should let the user know.
    }
}
