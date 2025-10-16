import { describe, expect, it, vi } from "vitest";
import {
    combinePrepareSteps,
    createAdaptiveSystemPrompt,
    createContextManager,
    createToolResultSummarizer,
} from "@/agent/execution/prepareStep.js";

describe("PrepareStep Module", () => {
    describe("createContextManager", () => {
        it("should trim messages when exceeding limit", async () => {
            const prepareStep = createContextManager(5);

            const messages = Array.from({ length: 10 }, (_, i) => ({
                role: "user" as const,
                content: `Message ${i}`,
            }));

            const result = await prepareStep({
                messages,
                stepNumber: 5,
                steps: [],
                model: {} as any,
            });

            expect(result.messages).toBeDefined();
            expect(result.messages?.length).toBe(5);
            expect(result.messages?.[0]).toEqual(messages[0]);
        });

        it("should not trim when under limit", async () => {
            const prepareStep = createContextManager(20);

            const messages = Array.from({ length: 5 }, (_, i) => ({
                role: "user" as const,
                content: `Message ${i}`,
            }));

            const result = await prepareStep({
                messages,
                stepNumber: 2,
                steps: [],
                model: {} as any,
            });

            expect(result).toEqual({});
        });
    });

    describe("createToolResultSummarizer", () => {
        it("should truncate long tool results", async () => {
            const prepareStep = createToolResultSummarizer(100);

            const longContent = "x".repeat(500);
            const messages = [
                { role: "user" as const, content: "test" },
                { role: "tool" as const, content: longContent },
            ];

            const result = await prepareStep({
                messages,
                stepNumber: 1,
                steps: [],
                model: {} as any,
            });

            expect(result.messages).toBeDefined();
            const toolMessage = result.messages?.[1];
            expect(toolMessage?.content).toContain("[Content truncated");
            expect((toolMessage?.content as string).length).toBeLessThan(longContent.length);
        });

        it("should not modify short messages", async () => {
            const prepareStep = createToolResultSummarizer(1000);

            const messages = [
                { role: "user" as const, content: "test" },
                { role: "tool" as const, content: "short result" },
            ];

            const result = await prepareStep({
                messages,
                stepNumber: 1,
                steps: [],
                model: {} as any,
            });

            expect(result.messages?.[1]?.content).toBe("short result");
        });
    });

    describe("createAdaptiveSystemPrompt", () => {
        it("should adapt prompt after multiple errors", async () => {
            const basePrompt = "You are a helpful assistant";
            const prepareStep = createAdaptiveSystemPrompt(basePrompt);

            const steps = [
                {
                    toolResults: [
                        { result: "Error: Something went wrong" },
                        { result: "Error: Another issue" },
                    ],
                },
            ];

            const result = await prepareStep({
                messages: [],
                stepNumber: 3,
                steps: steps as any,
                model: {} as any,
            });

            expect(result.system).toBeDefined();
            expect(result.system).toContain("multiple errors");
            expect(result.system).toContain(basePrompt);
        });

        it("should adapt prompt after many steps", async () => {
            const basePrompt = "You are a helpful assistant";
            const prepareStep = createAdaptiveSystemPrompt(basePrompt);

            const result = await prepareStep({
                messages: [],
                stepNumber: 15,
                steps: [],
                model: {} as any,
            });

            expect(result.system).toBeDefined();
            expect(result.system).toContain("many steps");
        });

        it("should not adapt prompt when no issues", async () => {
            const basePrompt = "You are a helpful assistant";
            const prepareStep = createAdaptiveSystemPrompt(basePrompt);

            const result = await prepareStep({
                messages: [],
                stepNumber: 2,
                steps: [{ toolResults: [{ result: "Success" }] }] as any,
                model: {} as any,
            });

            expect(result).toEqual({});
        });
    });

    describe("combinePrepareSteps", () => {
        it("should combine multiple prepare steps", () => {
            const step1 = vi.fn(() => ({ system: "System 1" }));
            const step2 = vi.fn(() => ({ toolChoice: "auto" as const }));

            const combined = combinePrepareSteps(step1, step2);

            const result = combined({
                messages: [],
                stepNumber: 1,
                steps: [],
                model: {} as any,
            });

            expect(step1).toHaveBeenCalled();
            expect(step2).toHaveBeenCalled();
            expect(result).toEqual({
                system: "System 1",
                toolChoice: "auto",
            });
        });

        it("should handle empty prepare steps", () => {
            const combined = combinePrepareSteps();

            const result = combined({
                messages: [],
                stepNumber: 1,
                steps: [],
                model: {} as any,
            });

            expect(result).toEqual({});
        });
    });
});
