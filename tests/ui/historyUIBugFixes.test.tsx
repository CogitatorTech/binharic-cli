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

describe("History UI Bug Fixes", () => {
    it("renders tool failure messages and hides tool requests/results", () => {
        const history: HistoryItem[] = [
            {
                id: "1",
                role: "tool-request",
                calls: [
                    {
                        type: "tool-call" as const,
                        toolCallId: "id-1",
                        toolName: "readFile",
                        args: { path: "a.txt" },
                    } as any,
                ],
            } as any,
            {
                id: "2",
                role: "tool-result",
                toolCallId: "id-1",
                toolName: "readFile",
                output: "content",
            } as any,
            {
                id: "3",
                role: "tool-failure",
                toolName: "readFile",
                error: "File not found",
            } as any,
        ];

        mockedUseStore.mockImplementation((selector) => selector(createMockState(history)));

        const { lastFrame } = render(<History />);
        const frame = lastFrame();
        expect(frame).toContain("› Tool Failure (readFile):");
        expect(frame).toContain("File not found");
        expect(frame).not.toContain("Proposed Tool Call(s):");
        expect(frame).not.toContain("content");
    });

    it("renders assistant markdown content as plain text segments", () => {
        const history: HistoryItem[] = [
            {
                id: "4",
                role: "assistant",
                content: "# Title\n\n- item one\n- item two",
            } as any,
        ];

        mockedUseStore.mockImplementation((selector) => selector(createMockState(history)));

        const { lastFrame } = render(<History />);
        const frame = lastFrame();
        expect(frame).toContain("Title");
        expect(frame).toContain("- item one");
        expect(frame).toContain("- item two");
    });
});
