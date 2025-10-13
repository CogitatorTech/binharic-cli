import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/agent/llm", () => ({
    createLlmProvider: vi.fn(() => ({ id: "mock", provider: "openai" })),
}));

const captured: any[] = [];

vi.mock("ai", async (importOriginal) => {
    const actual: any = await importOriginal();
    class TestAgent {
        options: any;
        constructor(options: any) {
            this.options = options;
            captured.push(options);
        }
        async generate(_: any) {
            return { text: "" };
        }
        stream(_: any) {
            return { textStream: (async function* () {})() } as any;
        }
    }
    return { ...actual, Experimental_Agent: TestAgent };
});

import type { Config } from "../../src/config";
import {
    createCodeAnalysisAgent,
    createSecurityAuditAgent,
    createRefactoringAgent,
    createTestGenerationAgent,
} from "../../src/agent/agents";

const baseConfig: Config = {
    userName: "tester",
    systemPrompt: "test",
    defaultModel: "test-model",
    models: [{ name: "test-model", provider: "openai", modelId: "gpt-4o", context: 128000 }],
    history: { maxItems: null },
};

describe("Specialized Agents", () => {
    beforeEach(() => {
        captured.length = 0;
        vi.clearAllMocks();
    });
    afterEach(() => {
        captured.length = 0;
    });

    it("code analysis agent subsets tools and step limit", async () => {
        const agent = await createCodeAnalysisAgent(baseConfig);
        expect(agent).toBeDefined();
        const opts = captured.at(-1);
        expect(Object.keys(opts.tools)).toEqual(
            expect.arrayContaining(["read_file", "list", "search", "grep_search", "get_errors"]),
        );
        expect(Object.keys(opts.tools)).not.toEqual(expect.arrayContaining(["bash", "create"]));
        expect(opts.stopWhen).toBeDefined();
    });

    it("security audit agent requires tools and includes bash", async () => {
        const agent = await createSecurityAuditAgent(baseConfig);
        expect(agent).toBeDefined();
        const opts = captured.at(-1);
        expect(Object.keys(opts.tools)).toEqual(
            expect.arrayContaining(["read_file", "list", "search", "grep_search", "bash"]),
        );
        expect(opts.toolChoice).toBe("required");
    });

    it("refactoring agent includes edit/create/errors and terminal", async () => {
        const agent = await createRefactoringAgent(baseConfig);
        expect(agent).toBeDefined();
        const opts = captured.at(-1);
        expect(Object.keys(opts.tools)).toEqual(
            expect.arrayContaining([
                "read_file",
                "insert_edit_into_file",
                "create",
                "get_errors",
                "run_in_terminal",
            ]),
        );
    });

    it("test generation agent includes terminal tools", async () => {
        const agent = await createTestGenerationAgent(baseConfig);
        expect(agent).toBeDefined();
        const opts = captured.at(-1);
        expect(Object.keys(opts.tools)).toEqual(
            expect.arrayContaining([
                "read_file",
                "create",
                "list",
                "run_in_terminal",
                "get_terminal_output",
            ]),
        );
    });
});
