import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "@/agent/core/state.js";
import type { ToolRequestItem } from "@/agent/context/history.js";
import type { Config } from "@/config.js";

const minimalConfig: Config = {
    userName: "TestUser",
    systemPrompt: "System",
    defaultModel: "gpt-5-mini",
    models: [{ name: "gpt-5-mini", provider: "openai", modelId: "gpt-5-mini", context: 400000 }],
    history: { maxItems: null },
    apiKeys: { openai: "OPENAI_API_KEY", google: "GOOGLE_API_KEY", anthropic: "ANTHROPIC_API_KEY" },
    mcpServers: {},
};

describe("Tool execution cancellation", () => {
    beforeEach(() => {
        useStore.setState({
            history: [],
            status: "tool-request",
            config: minimalConfig,
            pendingToolRequest: {
                id: "req-1",
                role: "tool-request",
                calls: [
                    {
                        type: "tool-call",
                        toolCallId: "tc-1",
                        toolName: "read_file",
                        args: { path: "README.md" },
                    } as any,
                ],
            } as ToolRequestItem,
        } as any);
    });

    it("should set idle and append interruption message when cancelled before execution starts", async () => {
        const spyRun = vi.fn();
        useStore.setState((s) => ({ actions: { ...s.actions, _runAgentLogic: spyRun } }) as any);

        useStore.getState().actions.stopAgent();

        await useStore.getState().actions.confirmToolExecution();

        const state = useStore.getState();

        expect(state.status).toBe("idle");

        const lastTwo = state.history.slice(-2);
        const hasToolFailure = lastTwo.some((h) => h.role === "tool-failure");
        const hasInterrupted = lastTwo.some(
            (h) =>
                h.role === "assistant" &&
                String((h as any).content).includes("Interrupted by user"),
        );

        expect(hasToolFailure).toBe(true);
        expect(hasInterrupted).toBe(true);

        expect(spyRun).not.toHaveBeenCalled();
    });
});
