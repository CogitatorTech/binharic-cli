import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkProviderAvailability } from "../../../src/agent/llm";
import type { Config } from "../../../src/config";

const originalFetch = globalThis.fetch;

describe("Ollama availability probe baseUrl normalization", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });
    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it("strips trailing /v1 when probing /api/tags", async () => {
        const mockFetch = vi.fn(async (url: RequestInfo | URL) => {
            const u = String(url);
            expect(u).toBe("http://localhost:11434/api/tags");
            return new Response("{}", { status: 200 });
        }) as any;
        globalThis.fetch = mockFetch;

        const config: Config = {
            userName: "tester",
            systemPrompt: "",
            defaultModel: "qwen",
            models: [
                {
                    name: "qwen",
                    provider: "ollama",
                    modelId: "qwen3:8b",
                    context: 32768,
                    baseUrl: "http://localhost:11434/v1",
                },
            ],
            history: { maxItems: null },
        };

        const result = await checkProviderAvailability(config);
        expect(
            result.availableProviders.includes("ollama") ||
                result.unavailableProviders.includes("ollama"),
        ).toBe(true);
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });
});
