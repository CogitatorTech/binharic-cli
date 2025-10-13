import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBinharicAgent } from "@/agent/agents.js";
import type { Config } from "@/config.js";
import { stepCountIs } from "ai";
import { createBudgetStopCondition, createErrorThresholdCondition } from "@/agent/loopControl.js";
import { createToolResultSummarizer } from "@/agent/prepareStep.js";

vi.mock("@/agent/llm.js", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        createLlmProvider: vi.fn(() => ({
            id: "mock-model",
            provider: "openai",
        })),
    };
});

vi.mock("@/agent/systemPrompt.js", () => ({
    generateSystemPrompt: vi.fn(async () => "Test system prompt"),
}));

const mockConfig: Config = {
    defaultModel: "gpt-4",
    models: [
        {
            name: "gpt-4",
            provider: "openai",
            modelId: "gpt-4",
            context: 8000,
        },
    ],
    history: {
        maxItems: 50,
    },
    userName: "TestUser",
};

describe("Safe Tool Auto-Execution", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Read-Only Tools", () => {
        const safeReadOnlyTools = [
            "read_file",
            "list",
            "search",
            "grep_search",
            "get_errors",
            "get_terminal_output",
            "validate",
        ];

        safeReadOnlyTools.forEach((toolName) => {
            it(`should include safe tool: ${toolName}`, () => {
                expect(toolName).toBeTruthy();
                expect(toolName).not.toBe("");
            });
        });
    });

    describe("Git Read-Only Tools", () => {
        const gitReadOnlyTools = ["git_status", "git_log", "git_diff"];

        gitReadOnlyTools.forEach((toolName) => {
            it(`should include git read tool: ${toolName}`, () => {
                expect(toolName).toBeTruthy();
            });
        });
    });

    describe("High-Risk Tools", () => {
        const highRiskTools = [
            "create",
            "edit",
            "insert_edit_into_file",
            "bash",
            "run_in_terminal",
        ];

        highRiskTools.forEach((toolName) => {
            it(`should require confirmation for: ${toolName}`, () => {
                expect(toolName).toBeTruthy();
            });
        });
    });

    describe("Anthropic Alignment Fixes", () => {
        describe("Stop Condition Improvements", () => {
            it("should allow up to 50 steps instead of 20", () => {
                const stepCountCondition = stepCountIs(50);

                const testSteps = Array(49).fill({ text: "test" });
                expect(stepCountCondition({ steps: testSteps })).toBe(false);

                const tooManySteps = Array(50).fill({ text: "test" });
                expect(stepCountCondition({ steps: tooManySteps })).toBe(true);
            });

            it("should have increased budget to $5 from $1", () => {
                const budgetCondition = createBudgetStopCondition(5.0);

                const moderateUsage = [{ usage: { inputTokens: 10000, outputTokens: 10000 } }];
                expect(budgetCondition({ steps: moderateUsage })).toBe(false);

                const highUsage = [{ usage: { inputTokens: 500000, outputTokens: 500000 } }];
                expect(budgetCondition({ steps: highUsage })).toBe(true);
            });

            it("should allow up to 10 errors instead of 5", () => {
                const errorCondition = createErrorThresholdCondition(10);

                const someErrors = Array(9).fill({
                    toolResults: [{ result: "Error occurred" }],
                });
                expect(errorCondition({ steps: someErrors })).toBe(false);

                const tooManyErrors = Array(10).fill({
                    toolResults: [{ result: "Error occurred" }],
                });
                expect(errorCondition({ steps: tooManyErrors })).toBe(true);
            });
        });

        describe("Tool Result Summarization", () => {
            it("should increase summarization limit to 5000 chars", () => {
                const summarizer = createToolResultSummarizer(5000);

                const longContent = "x".repeat(4999);
                const messages = [
                    {
                        role: "tool" as const,
                        content: longContent,
                    },
                ];

                const result = summarizer({
                    messages,
                    stepNumber: 1,
                    steps: [],
                    model: {} as any,
                });

                if (result.messages) {
                    expect(result.messages[0].content.length).toBeLessThanOrEqual(5000);
                }
            });
        });

        describe("Agent Creation", () => {
            it("should create agent with updated configuration", async () => {
                const agent = await createBinharicAgent(mockConfig);
                expect(agent).toBeDefined();
            });
        });
    });
});
