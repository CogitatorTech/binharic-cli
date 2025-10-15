import React from "react";
import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { UserInput } from "@/ui/UserInput";
import { useStore } from "@/agent/core/state";

vi.mock("@/agent/core/state");

const mockedUseStore = vi.mocked(useStore);

describe("UserInput - Busy placeholder hint", () => {
    it("shows Esc cancel hint when agent is busy (responding)", () => {
        mockedUseStore.mockImplementation((selector: any) =>
            selector({
                history: [],
                commandHistory: [],
                commandHistoryIndex: 0,
                status: "responding",
                error: null,
                config: null,
                helpMenuOpen: false,
                branchName: "main",
                pendingToolRequest: null,
                pendingCheckpoint: null,
                contextFiles: [],
                actions: {
                    startAgent: vi.fn(),
                    openHelpMenu: vi.fn(),
                    closeHelpMenu: vi.fn(),
                    clearOutput: vi.fn(),
                    clearCommandHistory: vi.fn(),
                    getPreviousCommand: vi.fn(() => null),
                    getNextCommand: vi.fn(() => null),
                    setSystemPrompt: vi.fn(),
                    setModel: vi.fn(),
                    addCommandToHistory: vi.fn(),
                    addContextFile: vi.fn(),
                    clearContextFiles: vi.fn(),
                    loadInitialConfig: vi.fn(),
                    updateBranchName: vi.fn(),
                    stopAgent: vi.fn(),
                    _runAgentLogic: vi.fn(),
                    confirmToolExecution: vi.fn(),
                    rejectToolExecution: vi.fn(),
                    confirmCheckpoint: vi.fn(),
                    rejectCheckpoint: vi.fn(),
                    clearError: vi.fn(),
                },
            }),
        );

        const { lastFrame } = render(<UserInput />);
        const frame = lastFrame();
        expect(frame).toContain("Agent is working... (Press Esc to cancel)");
    });

    it("shows normal placeholder when idle", () => {
        mockedUseStore.mockImplementation((selector: any) =>
            selector({
                history: [],
                commandHistory: [],
                commandHistoryIndex: 0,
                status: "idle",
                error: null,
                config: null,
                helpMenuOpen: false,
                branchName: "main",
                pendingToolRequest: null,
                pendingCheckpoint: null,
                contextFiles: [],
                actions: {
                    startAgent: vi.fn(),
                    openHelpMenu: vi.fn(),
                    closeHelpMenu: vi.fn(),
                    clearOutput: vi.fn(),
                    clearCommandHistory: vi.fn(),
                    getPreviousCommand: vi.fn(() => null),
                    getNextCommand: vi.fn(() => null),
                    setSystemPrompt: vi.fn(),
                    setModel: vi.fn(),
                    addCommandToHistory: vi.fn(),
                    addContextFile: vi.fn(),
                    clearContextFiles: vi.fn(),
                    loadInitialConfig: vi.fn(),
                    updateBranchName: vi.fn(),
                    stopAgent: vi.fn(),
                    _runAgentLogic: vi.fn(),
                    confirmToolExecution: vi.fn(),
                    rejectToolExecution: vi.fn(),
                    confirmCheckpoint: vi.fn(),
                    rejectCheckpoint: vi.fn(),
                    clearError: vi.fn(),
                },
            }),
        );

        const { lastFrame } = render(<UserInput />);
        const frame = lastFrame();
        expect(frame).toContain("Type your message or @path/to/file");
    });
});
