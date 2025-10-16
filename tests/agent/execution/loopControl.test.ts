import { describe, expect, it } from "vitest";
import {
    createBudgetStopCondition,
    createCompletionCondition,
    createErrorThresholdCondition,
    createSuccessCondition,
    createToolSequenceCondition,
    createValidationStopCondition,
} from "@/agent/execution/loopControl.js";

describe("Loop Control Module", () => {
    describe("createBudgetStopCondition", () => {
        it("should stop when budget exceeded", () => {
            const stopCondition = createBudgetStopCondition(0.5);

            const result = stopCondition({
                steps: [
                    {
                        usage: { inputTokens: 10000, outputTokens: 5000 },
                    },
                    {
                        usage: { inputTokens: 20000, outputTokens: 10000 },
                    },
                ],
            } as any);

            expect(result).toBe(true);
        });

        it("should not stop when under budget", () => {
            const stopCondition = createBudgetStopCondition(1.0);

            const result = stopCondition({
                steps: [
                    {
                        usage: { inputTokens: 1000, outputTokens: 500 },
                    },
                ],
            } as any);

            expect(result).toBe(false);
        });
    });

    describe("createSuccessCondition", () => {
        it("should stop when success marker found", () => {
            const stopCondition = createSuccessCondition("ANSWER:");

            const result = stopCondition({
                steps: [{ text: "Thinking..." }, { text: "ANSWER: The solution is 42" }],
            } as any);

            expect(result).toBe(true);
        });

        it("should not stop when marker not found", () => {
            const stopCondition = createSuccessCondition("ANSWER:");

            const result = stopCondition({
                steps: [{ text: "Still working on it..." }],
            } as any);

            expect(result).toBe(false);
        });
    });

    describe("createValidationStopCondition", () => {
        it("should stop when validation passes", () => {
            const stopCondition = createValidationStopCondition();

            const result = stopCondition({
                steps: [
                    {
                        toolCalls: [{ toolName: "validate" }],
                        toolResults: [
                            {
                                toolName: "validate",
                                result: "✅ Validation Successful: File verified",
                            },
                        ],
                    },
                ],
            } as any);

            expect(result).toBe(true);
        });

        it("should not stop when validation fails", () => {
            const stopCondition = createValidationStopCondition();

            const result = stopCondition({
                steps: [
                    {
                        toolCalls: [{ toolName: "validate" }],
                        toolResults: [
                            {
                                toolName: "validate",
                                result: "❌ Validation Failed",
                            },
                        ],
                    },
                ],
            } as any);

            expect(result).toBe(false);
        });
    });

    describe("createErrorThresholdCondition", () => {
        it("should stop when error threshold reached", () => {
            const stopCondition = createErrorThresholdCondition(2);

            const result = stopCondition({
                steps: [
                    {
                        toolResults: [
                            { result: "Error: File not found" },
                            { result: "Error: Permission denied" },
                        ],
                    },
                ],
            } as any);

            expect(result).toBe(true);
        });

        it("should not stop when under threshold", () => {
            const stopCondition = createErrorThresholdCondition(5);

            const result = stopCondition({
                steps: [
                    {
                        toolResults: [{ result: "Error: Minor issue" }],
                    },
                ],
            } as any);

            expect(result).toBe(false);
        });
    });

    describe("createToolSequenceCondition", () => {
        it("should stop when required sequence completed", () => {
            const stopCondition = createToolSequenceCondition(["read_file", "edit", "validate"]);

            const result = stopCondition({
                steps: [
                    {
                        toolCalls: [{ toolName: "read_file" }, { toolName: "list" }],
                    },
                    {
                        toolCalls: [{ toolName: "edit" }],
                    },
                    {
                        toolCalls: [{ toolName: "validate" }],
                    },
                ],
            } as any);

            expect(result).toBe(true);
        });

        it("should not stop when sequence incomplete", () => {
            const stopCondition = createToolSequenceCondition(["read_file", "edit", "validate"]);

            const result = stopCondition({
                steps: [
                    {
                        toolCalls: [{ toolName: "read_file" }],
                    },
                    {
                        toolCalls: [{ toolName: "edit" }],
                    },
                ],
            } as any);

            expect(result).toBe(false);
        });
    });

    describe("createCompletionCondition", () => {
        it("should stop when task appears complete", () => {
            const stopCondition = createCompletionCondition();

            const result = stopCondition({
                steps: [
                    {
                        text: "I have completed the task successfully. All files have been updated and validated.",
                        toolCalls: [],
                    },
                ],
            } as any);

            expect(result).toBe(true);
        });

        it("should not stop when still working", () => {
            const stopCondition = createCompletionCondition();

            const result = stopCondition({
                steps: [
                    {
                        text: "Working on the task",
                        toolCalls: [{ toolName: "read_file" }],
                    },
                ],
            } as any);

            expect(result).toBe(false);
        });
    });
});
