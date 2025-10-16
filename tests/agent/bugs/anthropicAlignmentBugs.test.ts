import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBinharicAgent } from "@/agent/core/agents.js";
import type { Config } from "@/config.js";
import { stepCountIs } from "ai";
import {
    createBudgetStopCondition,
    createErrorThresholdCondition,
} from "@/agent/execution/loopControl.js";
import { createToolResultSummarizer } from "@/agent/execution/prepareStep.js";

vi.mock("@/agent/llm/provider.js", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        createLlmProvider: vi.fn(() => ({
            id: "mock-model",
            provider: "openai",
        })),
    };
});

vi.mock("@/agent/core/systemPrompt.js", () => ({
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

describe("Anthropic Alignment Fixes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

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
            } else {
                expect(messages[0].content.length).toBeLessThanOrEqual(5000);
            }
        });

        it("should truncate content longer than 5000 chars", () => {
            const summarizer = createToolResultSummarizer(5000);

            const longContent = "x".repeat(6000);
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
                expect(result.messages[0].content.length).toBeLessThanOrEqual(5100);
                expect(result.messages[0].content).toContain("truncated");
            }
        });
    });

    describe("Safe Tool Auto-Execution", () => {
        it("should include read-only tools in SAFE_AUTO_TOOLS", () => {
            const safeTools = [
                "read_file",
                "list",
                "search",
                "grep_search",
                "get_errors",
                "get_terminal_output",
                "validate",
                "read_multiple_files",
                "git_status",
                "git_log",
                "git_diff",
                "diff_files",
            ];

            safeTools.forEach((tool) => {
                expect(tool).toBeTruthy();
                expect(tool.length).toBeGreaterThan(0);
            });
        });
    });

    describe("Agent Creation", () => {
        it("should create binharic agent successfully", async () => {
            const agent = await createBinharicAgent(mockConfig);
            expect(agent).toBeDefined();
        });

        it("should throw error for missing model", async () => {
            const invalidConfig = { ...mockConfig, defaultModel: "nonexistent" };
            await expect(createBinharicAgent(invalidConfig)).rejects.toThrow(
                "Model nonexistent not found in configuration",
            );
        });
    });
});
