import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "@/agent/state";
import { FatalError, TransientError } from "@/agent/errors";

// Mock dependencies
vi.mock("@/agent/llm");
vi.mock("@/agent/tools");
vi.mock("@/agent/system-prompt", () => ({
    generateSystemPrompt: vi.fn().mockResolvedValue("mocked system prompt"),
}));
vi.mock("@/config", () => ({
    ...vi.importActual("@/config"),
    getConfigDir: () => "/tmp/tobi-test",
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
        // Reset the store before each test
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
        });
    });

    it("should transition to error state on FatalError", async () => {
        const { streamAssistantResponse } = await import("@/agent/llm");
        vi.mocked(streamAssistantResponse).mockRejectedValue(new FatalError("Fatal error"));

        await useStore.getState().actions._runAgentLogic();

        const state = useStore.getState();
        expect(state.status).toBe("error");
        expect(state.error).toBe("Fatal error");
    });

    it("should transition to error state on any other error", async () => {
        const { streamAssistantResponse } = await import("@/agent/llm");
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
        expect(state.status).toBe("error"); // Should remain in error state
    });

    it("should retry on TransientError", async () => {
        const { streamAssistantResponse } = await import("@/agent/llm");
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

        // Wait for initial call + backoff delay (1000ms) + retry call
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const state = useStore.getState();
        expect(state.status).toBe("idle");
        expect(streamAssistantResponse).toHaveBeenCalledTimes(2);
    }, 3000); // Increase timeout for this test
});
