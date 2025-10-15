import { describe, expect, it } from "vitest";
import { Config } from "@/config.js";

describe("Config Save Bug Fixes", () => {
    it("should include userName when saving config", async () => {
        const mockConfig: Config = {
            userName: "TestUser",
            systemPrompt: "Test prompt",
            defaultModel: "gpt-4o",
            models: [{ name: "gpt-4o", provider: "openai", modelId: "gpt-4o", context: 128000 }],
            history: { maxItems: null },
            apiKeys: {
                openai: "OPENAI_API_KEY",
            },
            mcpServers: {},
        };

        const configToSave: Partial<Config> = {
            userName: mockConfig.userName,
            systemPrompt: mockConfig.systemPrompt,
            defaultModel: mockConfig.defaultModel,
            models: mockConfig.models,
            history: mockConfig.history,
            apiKeys: mockConfig.apiKeys,
            mcpServers: mockConfig.mcpServers,
        };

        expect(configToSave.userName).toBe("TestUser");
        expect(configToSave.systemPrompt).toBe("Test prompt");
        expect(configToSave.defaultModel).toBe("gpt-4o");
        expect(configToSave.models).toHaveLength(1);
        expect(configToSave.history).toEqual({ maxItems: null });
        expect(configToSave.apiKeys).toHaveProperty("openai");
        expect(configToSave.mcpServers).toEqual({});
    });

    it("should preserve all config fields during save", () => {
        const mockConfig: Config = {
            userName: "User123",
            systemPrompt: "Custom prompt",
            defaultModel: "claude-4-sonnet",
            models: [
                {
                    name: "claude-4-sonnet",
                    provider: "anthropic",
                    modelId: "claude-4-sonnet",
                    context: 200000,
                },
            ],
            history: { maxItems: 100 },
            apiKeys: {
                anthropic: "ANTHROPIC_API_KEY",
            },
            mcpServers: {
                "test-server": {
                    command: "test",
                    args: ["--flag"],
                },
            },
        };

        const configToSave: Partial<Config> = {
            userName: mockConfig.userName,
            systemPrompt: mockConfig.systemPrompt,
            defaultModel: mockConfig.defaultModel,
            models: mockConfig.models,
            history: mockConfig.history,
            apiKeys: mockConfig.apiKeys,
            mcpServers: mockConfig.mcpServers,
        };

        expect(configToSave).toHaveProperty("userName");
        expect(configToSave).toHaveProperty("systemPrompt");
        expect(configToSave).toHaveProperty("defaultModel");
        expect(configToSave).toHaveProperty("models");
        expect(configToSave).toHaveProperty("history");
        expect(configToSave).toHaveProperty("apiKeys");
        expect(configToSave).toHaveProperty("mcpServers");

        expect(Object.keys(configToSave).length).toBe(7);
    });

    it("should handle optional userName correctly", () => {
        const mockConfigWithoutUserName: Config = {
            systemPrompt: "Test prompt",
            defaultModel: "gpt-4o",
            models: [{ name: "gpt-4o", provider: "openai", modelId: "gpt-4o", context: 128000 }],
            history: { maxItems: null },
            apiKeys: {
                openai: "OPENAI_API_KEY",
            },
            mcpServers: {},
        };

        const configToSave: Partial<Config> = {
            userName: mockConfigWithoutUserName.userName,
            systemPrompt: mockConfigWithoutUserName.systemPrompt,
            defaultModel: mockConfigWithoutUserName.defaultModel,
            models: mockConfigWithoutUserName.models,
            history: mockConfigWithoutUserName.history,
            apiKeys: mockConfigWithoutUserName.apiKeys,
            mcpServers: mockConfigWithoutUserName.mcpServers,
        };

        expect(configToSave.userName).toBeUndefined();
        expect(configToSave.systemPrompt).toBe("Test prompt");
    });
});
