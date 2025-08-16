import React from "react";
import { render } from "ink-testing-library";
import { History } from "@/ui/History";
import { useStore } from "@/agent/state";
import { describe, expect, it, vi } from "vitest";
import type { HistoryItem } from "@/agent/history"; // CORRECTED IMPORT

// Mock the zustand store
vi.mock("@/agent/state");

const mockedUseStore = vi.mocked(useStore);

describe("History", () => {
    it("should render user messages", () => {
        const history: HistoryItem[] = [
            { id: "1", role: "user", content: "/help" },
            { id: "2", role: "user", content: "hello" },
        ];

        mockedUseStore.mockImplementation((selector) => selector({ history }));

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

        mockedUseStore.mockImplementation((selector) => selector({ history }));

        const { lastFrame } = render(<History />);

        expect(lastFrame()).toContain("Hello! How can I help you today?");
    });

    it("should render tool call messages", () => {
        const history: HistoryItem[] = [
            {
                id: "1",
                role: "tool-request", // CORRECTED: Use 'tool-request' role
                calls: [
                    // CORRECTED: Use 'calls' property
                    {
                        type: "tool-call",
                        toolCallId: "tool-call-123",
                        toolName: "readFile",
                        input: { path: "test.txt" },
                    },
                ],
            },
        ];

        mockedUseStore.mockImplementation((selector) => selector({ history }));

        const { lastFrame } = render(<History />);
        expect(lastFrame()).toContain("Proposed Tool Call(s):"); // CORRECTED: Updated expectation
        expect(lastFrame()).toContain('› readFile({"path":"test.txt"})'); // CORRECTED: Updated expectation
    });

    it("should render tool result messages", () => {
        const history: HistoryItem[] = [
            {
                id: "1",
                role: "tool-result", // CORRECTED: Use 'tool-result' role
                toolCallId: "tool-call-123",
                toolName: "readFile",
                output: "hello world",
            },
        ];

        mockedUseStore.mockImplementation((selector) => selector({ history }));

        const { lastFrame } = render(<History />);
        expect(lastFrame()).toContain("› Tool Result (readFile):"); // CORRECTED: Updated expectation
        expect(lastFrame()).toContain("hello world");
    });

    it("should render long tool result messages correctly", () => {
        const longOutput = "line 1\nline 2\nline 3";
        const history: HistoryItem[] = [
            {
                id: "1",
                role: "tool-result", // CORRECTED: Use 'tool-result' role
                toolCallId: "tool-call-456",
                toolName: "longTool",
                output: longOutput,
            },
        ];

        mockedUseStore.mockImplementation((selector) => selector({ history }));

        const { lastFrame } = render(<History />);
        expect(lastFrame()).toContain("› Tool Result (longTool):"); // CORRECTED: Updated expectation
        expect(lastFrame()).toContain("line 1");
        expect(lastFrame()).toContain("line 2");
        expect(lastFrame()).toContain("line 3");
    });
});
