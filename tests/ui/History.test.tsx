import React from "react";
import { render } from "ink-testing-library";
import { History } from "@/ui/History";
import { useStore } from "@/agent/state";
import { describe, expect, it, vi } from "vitest";
import type { HistoryItem } from "@/agent/history";

vi.mock("@/agent/state");

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

    it("should render tool call messages", () => {
        const history: HistoryItem[] = [
            {
                id: "1",
                role: "tool-request",
                calls: [
                    {
                        type: "tool-call",
                        toolCallId: "tool-call-123",
                        toolName: "readFile",
                        input: { path: "test.txt" },
                    },
                ],
            },
        ];

        mockedUseStore.mockImplementation((selector) => selector(createMockState(history)));

        const { lastFrame } = render(<History />);
        expect(lastFrame()).toContain("Proposed Tool Call(s):");
        expect(lastFrame()).toContain('› readFile({"path":"test.txt"})');
    });

    it("should render tool result messages", () => {
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
        expect(lastFrame()).toContain("› Tool Result (readFile):");
        expect(lastFrame()).toContain("hello world");
    });

    it("should render long tool result messages correctly", () => {
        const longOutput = "line 1\nline 2\nline 3";
        const history: HistoryItem[] = [
            {
                id: "1",
                role: "tool-result",
                toolCallId: "tool-call-456",
                toolName: "longTool",
                output: longOutput,
            },
        ];

        mockedUseStore.mockImplementation((selector) => selector(createMockState(history)));

        const { lastFrame } = render(<History />);
        expect(lastFrame()).toContain("› Tool Result (longTool):");
    });
});
