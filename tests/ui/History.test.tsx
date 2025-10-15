import React from "react";
import { render } from "ink-testing-library";
import { History } from "@/ui/History";
import { useStore } from "@/agent/core/state";
import { describe, expect, it, vi } from "vitest";
import type { HistoryItem } from "@/agent/context/history";

vi.mock("@/agent/core/state");

const mockedUseStore = vi.mocked(useStore);

const createMockState = (history: HistoryItem[]) => ({
    history,
    commandHistory: [],
    commandHistoryIndex: 0,
    status: "idle" as const,
    error: null,
    config: null,
    helpMenuOpen: false,
    branchName: "main",
    pendingToolRequest: null,
    actions: {} as any,
});

describe("History", () => {
    it("should render user messages", () => {
        const history: HistoryItem[] = [
            { id: "1", role: "user", content: "/help" },
            { id: "2", role: "user", content: "hello" },
        ];

        mockedUseStore.mockImplementation((selector) => selector(createMockState(history)));

        const { lastFrame } = render(<History />);

        expect(lastFrame()).toContain("> /help");
        expect(lastFrame()).toContain("> hello");
    });

    it("should render assistant messages", () => {
        const history: HistoryItem[] = [
            {
                id: "1",
                role: "assistant",
                content: "Hello! How can I help you today?",
            },
        ];

        mockedUseStore.mockImplementation((selector) => selector(createMockState(history)));

        const { lastFrame } = render(<History />);

        expect(lastFrame()).toContain("Hello! How can I help you today?");
    });

    it("should not render tool call messages (they are hidden in UI)", () => {
        const history: HistoryItem[] = [
            {
                id: "1",
                role: "tool-request",
                calls: [
                    {
                        type: "tool-call" as const,
                        toolCallId: "tool-call-123",
                        toolName: "readFile",
                        args: { path: "test.txt" },
                    } as unknown as any,
                ],
            },
        ];

        mockedUseStore.mockImplementation((selector) => selector(createMockState(history)));

        const { lastFrame } = render(<History />);
        expect(lastFrame()).not.toContain("Proposed Tool Call(s):");
        expect(lastFrame()).not.toContain("readFile");
    });

    it("should not render tool result messages (they are hidden in UI)", () => {
        const history: HistoryItem[] = [
            {
                id: "1",
                role: "tool-result",
                toolCallId: "tool-call-123",
                toolName: "readFile",
                output: "hello world",
            },
        ];

        mockedUseStore.mockImplementation((selector) => selector(createMockState(history)));

        const { lastFrame } = render(<History />);
        expect(lastFrame()).not.toContain("\u203a Tool Result (readFile):");
        expect(lastFrame()).not.toContain("hello world");
    });
});
