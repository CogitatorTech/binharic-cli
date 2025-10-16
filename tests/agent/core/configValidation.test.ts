import { describe, expect, it, vi } from "vitest";
import type { Config } from "../../../src/config.js";

function validateConfiguration(config: Config): void {
    const uniqueModelNames = new Set<string>();
    for (const model of config.models) {
        if (uniqueModelNames.has(model.name)) {
            throw new Error(
                `Duplicate model name found: "${model.name}". Model names must be unique.`,
            );
        }
        uniqueModelNames.add(model.name);

        if (model.context <= 0) {
            throw new Error(
                `Model "${model.name}" has invalid context window: ${model.context}. Must be positive.`,
            );
        }

        if (model.context > 10000000) {
            console.warn(
                `Model "${model.name}" has unusually large context window: ${model.context}. This may cause performance issues.`,
            );
        }

        if (model.provider === "ollama" && !model.baseUrl) {
            console.warn(
                `Ollama model "${model.name}" does not specify baseUrl. Using default: http://localhost:11434/v1`,
            );
        }

        if (model.baseUrl) {
            try {
                new URL(model.baseUrl);
            } catch {
                throw new Error(
                    `Model "${model.name}" has invalid baseUrl: "${model.baseUrl}". Must be a valid URL.`,
                );
            }
        }
    }

    if (config.history?.maxItems !== null && config.history?.maxItems !== undefined) {
        if (config.history.maxItems < 1) {
            throw new Error(
                `history.maxItems must be positive or null, got: ${config.history.maxItems}`,
            );
        }
        if (config.history.maxItems < 10) {
            console.warn(
                `history.maxItems is very low (${config.history.maxItems}). Consider at least 10 for meaningful conversations.`,
            );
        }
    }
}

describe("Configuration Validation", () => {
    const validConfig: Config = {
        userName: "TestUser",
        systemPrompt: "Test prompt",
        defaultModel: "test-model",
        models: [
            {
                name: "test-model",
                provider: "openai",
                modelId: "gpt-4",
                context: 8000,
            },
        ],
        history: { maxItems: 100 },
        apiKeys: {
            openai: "OPENAI_API_KEY",
        },
        mcpServers: {},
    };

    describe("Model Name Uniqueness", () => {
        it("should accept unique model names", () => {
            const config = {
                ...validConfig,
                models: [
                    {
                        name: "model1",
                        provider: "openai" as const,
                        modelId: "gpt-4",
                        context: 8000,
                    },
                    {
                        name: "model2",
                        provider: "openai" as const,
                        modelId: "gpt-3.5",
                        context: 4000,
                    },
                ],
            };

            expect(() => validateConfiguration(config)).not.toThrow();
        });

        it("should reject duplicate model names", () => {
            const config = {
                ...validConfig,
                models: [
                    {
                        name: "duplicate",
                        provider: "openai" as const,
                        modelId: "gpt-4",
                        context: 8000,
                    },
                    {
                        name: "duplicate",
                        provider: "anthropic" as const,
                        modelId: "claude",
                        context: 100000,
                    },
                ],
            };

            expect(() => validateConfiguration(config)).toThrow(
                /Duplicate model name found: "duplicate"/,
            );
        });

        it("should detect duplicates case-sensitively", () => {
            const config = {
                ...validConfig,
                models: [
                    { name: "Model", provider: "openai" as const, modelId: "gpt-4", context: 8000 },
                    {
                        name: "model",
                        provider: "openai" as const,
                        modelId: "gpt-3.5",
                        context: 4000,
                    },
                ],
            };

            expect(() => validateConfiguration(config)).not.toThrow();
        });
    });

    describe("Context Window Validation", () => {
        it("should accept positive context windows", () => {
            const config = {
                ...validConfig,
                models: [
                    {
                        name: "test",
                        provider: "openai" as const,
                        modelId: "gpt-4",
                        context: 128000,
                    },
                ],
            };

            expect(() => validateConfiguration(config)).not.toThrow();
        });

        it("should reject zero context window", () => {
            const config = {
                ...validConfig,
                models: [
                    { name: "test", provider: "openai" as const, modelId: "gpt-4", context: 0 },
                ],
            };

            expect(() => validateConfiguration(config)).toThrow(/invalid context window: 0/);
        });

        it("should reject negative context window", () => {
            const config = {
                ...validConfig,
                models: [
                    { name: "test", provider: "openai" as const, modelId: "gpt-4", context: -1000 },
                ],
            };

            expect(() => validateConfiguration(config)).toThrow(/invalid context window: -1000/);
        });

        it("should warn about unusually large context windows", () => {
            const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

            const config = {
                ...validConfig,
                models: [
                    {
                        name: "test",
                        provider: "openai" as const,
                        modelId: "gpt-4",
                        context: 20000000,
                    },
                ],
            };

            validateConfiguration(config);

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining("unusually large context window"),
            );

            consoleWarnSpy.mockRestore();
        });

        it("should accept reasonable large context windows without warning", () => {
            const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

            const config = {
                ...validConfig,
                models: [
                    {
                        name: "test",
                        provider: "openai" as const,
                        modelId: "gpt-4",
                        context: 1000000,
                    },
                ],
            };

            validateConfiguration(config);

            const unusualWarnings = consoleWarnSpy.mock.calls.filter((call) =>
                call[0]?.includes("unusually large"),
            );
            expect(unusualWarnings).toHaveLength(0);

            consoleWarnSpy.mockRestore();
        });
    });

    describe("BaseURL Validation", () => {
        it("should accept valid URLs", () => {
            const config = {
                ...validConfig,
                models: [
                    {
                        name: "ollama",
                        provider: "ollama" as const,
                        modelId: "llama2",
                        context: 4000,
                        baseUrl: "http://localhost:11434/v1",
                    },
                ],
            };

            expect(() => validateConfiguration(config)).not.toThrow();
        });

        it("should reject invalid URLs", () => {
            const config = {
                ...validConfig,
                models: [
                    {
                        name: "ollama",
                        provider: "ollama" as const,
                        modelId: "llama2",
                        context: 4000,
                        baseUrl: "not-a-valid-url",
                    },
                ],
            };

            expect(() => validateConfiguration(config)).toThrow(/invalid baseUrl/);
        });

        it("should warn when ollama model lacks baseUrl", () => {
            const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

            const config = {
                ...validConfig,
                models: [
                    {
                        name: "ollama",
                        provider: "ollama" as const,
                        modelId: "llama2",
                        context: 4000,
                    },
                ],
            };

            validateConfiguration(config);

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining("does not specify baseUrl"),
            );

            consoleWarnSpy.mockRestore();
        });
    });

    describe("History Configuration", () => {
        it("should accept null maxItems", () => {
            const config = {
                ...validConfig,
                history: { maxItems: null },
            };

            expect(() => validateConfiguration(config)).not.toThrow();
        });

        it("should accept positive maxItems", () => {
            const config = {
                ...validConfig,
                history: { maxItems: 50 },
            };

            expect(() => validateConfiguration(config)).not.toThrow();
        });

        it("should reject zero maxItems", () => {
            const config = {
                ...validConfig,
                history: { maxItems: 0 },
            };

            expect(() => validateConfiguration(config)).toThrow(/must be positive or null/);
        });

        it("should reject negative maxItems", () => {
            const config = {
                ...validConfig,
                history: { maxItems: -10 },
            };

            expect(() => validateConfiguration(config)).toThrow(/must be positive or null/);
        });

        it("should warn about very low maxItems", () => {
            const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

            const config = {
                ...validConfig,
                history: { maxItems: 5 },
            };

            validateConfiguration(config);

            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("very low"));

            consoleWarnSpy.mockRestore();
        });

        it("should not warn about reasonable maxItems", () => {
            const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

            const config = {
                ...validConfig,
                history: { maxItems: 100 },
            };

            validateConfiguration(config);

            const lowWarnings = consoleWarnSpy.mock.calls.filter((call) =>
                call[0]?.includes("very low"),
            );
            expect(lowWarnings).toHaveLength(0);

            consoleWarnSpy.mockRestore();
        });
    });
});
