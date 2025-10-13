import { describe, it, expect, vi, beforeEach } from "vitest";
import { useStore } from "@/agent/state";
import fs from "fs";

vi.mock("@/agent/llm", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        streamAssistantResponse: vi.fn(),
    };
});

vi.mock("@/agent/systemPrompt", () => ({
    generateSystemPrompt: vi.fn(async () => "Test system prompt"),
}));

function createExistingFile(filePath: string, content: string) {
    fs.mkdirSync(require("path").dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
}

describe("Tool call rewrite: create -> edit when file exists", () => {
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
                    {
                        name: "test-model",
                        provider: "ollama",
                        modelId: "test-id",
                        context: 32768,
                    },
                ],
                systemPrompt: "test-prompt",
                history: { maxItems: 50 },
            } as any,
            helpMenuOpen: false,
            branchName: "test-branch",
            pendingToolRequest: null,
            pendingCheckpoint: null,
        } as any);
    });

    it("rewrites a create call to edit/overwrite before prompting the user", async () => {
        const tempPath = "tmp/create-to-edit-rewrite.md";
        createExistingFile(tempPath, "original");

        const { streamAssistantResponse } = await import("@/agent/llm");
        vi.mocked(streamAssistantResponse).mockResolvedValue({
            textStream: (async function* () {})(),
            toolCalls: Promise.resolve([
                {
                    toolCallId: "call-1",
                    toolName: "create",
                    args: { path: tempPath, content: "new content" },
                },
            ] as any),
        } as any);

        await useStore.getState().actions.startAgent("please create file");

        const state = useStore.getState();
        expect(state.status).toBe("tool-request");
        expect(state.pendingToolRequest).not.toBeNull();
        const call = state.pendingToolRequest!.calls[0] as any;
        expect(call.toolName).toBe("edit");
        expect(call.args).toEqual({
            path: tempPath,
            edit: { type: "overwrite", content: "new content" },
        });

        const last = state.history[state.history.length - 1];
        expect(last.role).toBe("tool-request");
        expect((last as any).calls[0].toolName).toBe("edit");
    });
});
