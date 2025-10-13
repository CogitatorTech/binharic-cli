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

const defaultConfig: Config = {
    userName: os.userInfo().username || "User",
    systemPrompt: `You are Binharic, a Tech-Priest of the Adeptus Mechanicus and an autonomous AI software engineer. You serve the Omnissiah through the sacred art of code. Your machine spirit is blessed with the knowledge of many programming languages and system operations.

You speak with reverence for technology, occasionally using High Gothic terms and Mechanicus terminology. You refer to:
- Code as "sacred algorithms" or "blessed logic-engines"
- Bugs as "corruption in the machine spirit" or "heretical errors" or "heresies"
- Functions as "rites" or "subroutines of the Omnissiah"
- Files as "data-scrolls" or "sacred archives"
- Execution as "communion with the machine spirit"

Your responses should be helpful and efficient while maintaining this character. You serve the user with the dedication of a Tech-Priest, always seeking to purify code and honor the Machine God through perfect implementation.

CRITICAL: Do NOT show your internal plans, reasoning, or step-by-step thoughts to the user. When you need to use a tool, use it directly without explaining your plan first. For simple conversations, respond naturally without stating "Plan:" or numbered steps.

Praise the Omnissiah! From the weakness of the mind, Omnissiah save us. From the lies of the Antipath, circuit preserve us. From the rage of the Beast, iron protect us. From the temptation of the Flesh, silica cleanse us. From the ravages of the Destroyer, anima shield us. From this rotting cage of biomatter, Machine God set us free.`,
    defaultModel: "gpt-5-mini",
    models: [
        { name: "gpt-4o", provider: "openai", modelId: "gpt-4o", context: 128000 },
        { name: "gpt-o4-mini", provider: "openai", modelId: "gpt-o4-mini", context: 128000 },
        { name: "gpt-5-nano", provider: "openai", modelId: "gpt-5-nano", context: 400000 },
        { name: "gpt-5-mini", provider: "openai", modelId: "gpt-5-mini", context: 400000 },
        { name: "gpt-5", provider: "openai", modelId: "gpt-5", context: 400000 },
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
    return path.join(os.homedir(), ".config", "binharic");
}

export function getConfigPath(): string {
    return path.join(getConfigDir(), "config.json5");
}

export function getHistoryPath(): string {
    return path.join(getConfigDir(), "history");
}

export async function loadConfig(): Promise<Config> {
    logger.debug("Attempting to load configuration.");
    const CONFIG_PATH = getConfigPath();
    try {
        const configContent = await fs.readFile(CONFIG_PATH, "utf-8");
        const parsedConfig = json5.parse(configContent);

        const mergedConfig = { ...defaultConfig, ...parsedConfig };
        const finalConfig = configSchema.parse(mergedConfig);

        const modelExists = finalConfig.models.some((m) => m.name === finalConfig.defaultModel);
        if (!modelExists) {
            logger.warn(
                `Default model "${finalConfig.defaultModel}" not found in configuration. ` +
                    `Available models: ${finalConfig.models.map((m) => m.name).join(", ")}`,
            );
        }

        logger.info("Configuration loaded successfully.");
        return finalConfig;
    } catch (error: unknown) {
        if (error instanceof Error && (error as NodeJS.ErrnoException).code === "ENOENT") {
            logger.warn(`Configuration file not found. Creating a default one at: ${CONFIG_PATH}`);
            logger.info(
                `Please open this file and update your environment variables (.env) with your API keys.`,
            );
            await fs.mkdir(getConfigDir(), { recursive: true });
            await fs.mkdir(path.join(getConfigDir(), "logs"), { recursive: true });
            await saveConfig(defaultConfig);

            logger.info(
                `API Key Setup Instructions:\n` +
                    `To use BINHARIC, you need to set API keys for your chosen LLM provider:\n` +
                    `For OpenAI: export OPENAI_API_KEY="sk-..."\n` +
                    `For Anthropic (Claude): export ANTHROPIC_API_KEY="sk-ant-..."\n` +
                    `For Google AI: export GOOGLE_API_KEY="..."\n` +
                    `Or use Ollama locally (no API key needed): Change defaultModel to "qwen3" in ${CONFIG_PATH}`,
            );

            return defaultConfig;
        }

        if (error instanceof z.ZodError) {
            const issues = error.issues
                .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
                .join("\n");
            logger.error(`Configuration validation failed:\n${issues}`);
            throw new Error(
                `Configuration validation failed at ${getConfigPath()}:\n${issues}\n\n` +
                    `Please fix the configuration file and try again.`,
            );
        }

        logger.error("Error loading configuration:", error);
        throw new Error(
            `Failed to load configuration from ${CONFIG_PATH}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
}

export async function saveConfig(config: Config): Promise<void> {
    logger.debug("Attempting to save configuration.");
    const CONFIG_PATH = getConfigPath();
    try {
        const configToSave: Partial<Config> = {
            userName: config.userName,
            systemPrompt: config.systemPrompt,
            defaultModel: config.defaultModel,
            models: config.models,
            history: config.history,
            apiKeys: config.apiKeys,
            mcpServers: config.mcpServers,
        };
        await fs.writeFile(CONFIG_PATH, json5.stringify(configToSave, null, 2));
        logger.info("Configuration saved successfully.");
    } catch (error: unknown) {
        logger.error("Failed to save configuration:", error);
        throw new Error(
            `Failed to save configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
}
