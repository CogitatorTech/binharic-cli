import { describe, it, expect, beforeEach, vi } from "vitest";
import { generateSystemPrompt } from "@/agent/systemPrompt.js";
import type { Config } from "@/config.js";
import fs from "fs/promises";

vi.mock("fs/promises");
vi.mock("os-locale", () => ({
    osLocale: vi.fn(async () => "en-US"),
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

describe("System Prompt Anthropic Alignment", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(fs.readdir).mockResolvedValue([
            { name: "src", isDirectory: () => true },
            { name: "package.json", isDirectory: () => false },
        ] as any);
        vi.mocked(fs.access).mockRejectedValue(new Error("Not found"));
    });

    describe("Transparency Principle", () => {
        it("should include planning requirements in system prompt", async () => {
            const prompt = await generateSystemPrompt(mockConfig);

            expect(prompt).toContain("Transparency First");
            expect(prompt).toContain("explain your plan first");
            expect(prompt).toContain("What you understand the task to be");
            expect(prompt).toContain("Your approach and reasoning");
            expect(prompt).toContain("What steps you will take");
        });

        it("should differentiate between simple and complex tasks", async () => {
            const prompt = await generateSystemPrompt(mockConfig);

            expect(prompt).toContain("simple queries");
            expect(prompt).toContain("complex tasks");
            expect(prompt).toContain("respond naturally");
        });
    });

    describe("Ground Truth Validation Principle", () => {
        it("should require verification after modifications", async () => {
            const prompt = await generateSystemPrompt(mockConfig);

            expect(prompt).toContain("Ground Truth Validation");
            expect(prompt).toContain("ALWAYS verify the results");
            expect(prompt).toContain("After editing a file, read it back");
            expect(prompt).toContain("After running commands, check outputs");
            expect(prompt).toContain("After creating files, verify they exist");
        });

        it("should require explicit verification statements", async () => {
            const prompt = await generateSystemPrompt(mockConfig);

            expect(prompt).toContain("State explicitly what you verified");
        });
    });

    describe("Error Recovery Principle", () => {
        it("should include error recovery guidelines", async () => {
            const prompt = await generateSystemPrompt(mockConfig);

            expect(prompt).toContain("Error Recovery");
            expect(prompt).toContain("Explain what went wrong and why");
            expect(prompt).toContain("Propose an alternative approach");
            expect(prompt).toContain("Learn from the error");
            expect(prompt).toContain("Don't retry the exact same action");
        });
    });

    describe("Progressive Disclosure Principle", () => {
        it("should encourage step-by-step execution", async () => {
            const prompt = await generateSystemPrompt(mockConfig);

            expect(prompt).toContain("Progressive Disclosure");
            expect(prompt).toContain("Break complex tasks into clear steps");
            expect(prompt).toContain("Execute one step at a time");
        });
    });

    describe("Task Completion Principle", () => {
        it("should require explicit completion signals", async () => {
            const prompt = await generateSystemPrompt(mockConfig);

            expect(prompt).toContain("Task Completion");
            expect(prompt).toContain("Summarize what was done");
            expect(prompt).toContain("Verify the final state");
            expect(prompt).toContain("State explicitly that the task is complete");
        });
    });

    describe("Tool Usage Philosophy", () => {
        it("should emphasize thoughtful tool usage", async () => {
            const prompt = await generateSystemPrompt(mockConfig);

            expect(prompt).toContain("Tool Usage Philosophy");
            expect(prompt).toContain("Read before writing");
            expect(prompt).toContain("Understand before modifying");
            expect(prompt).toContain("Verify after changing");
        });
    });
});
