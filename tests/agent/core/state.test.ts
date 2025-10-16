import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "@/agent/core/state";
import { FatalError, TransientError } from "@/agent/errors/index";

vi.mock("@/agent/llm/provider.js", () => ({
    streamAssistantResponse: vi.fn(),
    checkProviderAvailability: vi.fn().mockResolvedValue({
        available: true,
        availableProviders: ["ollama"],
        unavailableProviders: [],
    }),
}));

vi.mock("@/agent/tools");
vi.mock("@/agent/core/systemPrompt.js", () => ({
    generateSystemPrompt: vi.fn().mockResolvedValue("mocked system prompt"),
}));
vi.mock("@/config", () => ({
    ...vi.importActual("@/config"),
    getConfigDir: () => "/tmp/binharic-test",
    loadConfig: vi.fn().mockResolvedValue({
        defaultModel: "test-model",
        models: [{ name: "test-model", provider: "ollama", modelId: "test-id", context: 32768 }],
        systemPrompt: "test-prompt",
    }),
}));
vi.mock("simple-git");

describe("Agent State Machine", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useStore.setState({
            history: [],
            commandHistory: [],
            commandHistoryIndex: 0,
            status: "idle",
            error: null,
            config: {
                defaultModel: "test-model",
                models: [
                    { name: "test-model", provider: "ollama", modelId: "test-id", context: 32768 },
                ],
                systemPrompt: "test-prompt",
            },
            helpMenuOpen: false,
            branchName: "test-branch",
            pendingToolRequest: null,
            pendingCheckpoint: null,
            contextFiles: [],
        });
    });

    it("should transition to error state on FatalError", async () => {
        const { streamAssistantResponse } = await import("@/agent/llm/provider.js");
        vi.mocked(streamAssistantResponse).mockRejectedValue(new FatalError("Fatal error"));

        await useStore.getState().actions._runAgentLogic();

        const state = useStore.getState();
        expect(state.status).toBe("error");
        expect(state.error).toBe("Fatal error");
    });

    it("should transition to error state on any other error", async () => {
        const { streamAssistantResponse } = await import("@/agent/llm/provider.js");
        vi.mocked(streamAssistantResponse).mockRejectedValue(new Error("Some other error"));

        await useStore.getState().actions._runAgentLogic();

        const state = useStore.getState();
        expect(state.status).toBe("error");
        expect(state.error).toBe("Some other error");
    });

    it("should clear the error and return to idle", () => {
        useStore.setState({ status: "error", error: "An error occurred" });
        useStore.getState().actions.clearError();

        const state = useStore.getState();
        expect(state.status).toBe("idle");
        expect(state.error).toBe(null);
    });

    it("should not start agent when in error state", async () => {
        useStore.setState({ status: "error", error: "An error occurred" });
        await useStore.getState().actions.startAgent("test input");

        const state = useStore.getState();
        expect(state.status).toBe("error");
    });

    it("should retry on TransientError", async () => {
        const { streamAssistantResponse } = await import("@/agent/llm/provider.js");
        vi.mocked(streamAssistantResponse)
            .mockRejectedValueOnce(new TransientError("Rate limit"))
            .mockResolvedValueOnce({
                textStream: (async function* () {
                    yield "Response after retry";
                })(),
                toolCalls: Promise.resolve([]),
            } as any);

        const { actions } = useStore.getState();
        actions.startAgent("test");

        await new Promise((resolve) => setTimeout(resolve, 1500));

        const state = useStore.getState();
        expect(state.status).toBe("idle");
        expect(streamAssistantResponse).toHaveBeenCalledTimes(2);
    }, 3000);
});
