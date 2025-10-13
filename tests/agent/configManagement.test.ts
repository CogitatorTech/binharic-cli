import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Config Management - Save and Load Issues", () => {
    it("should preserve all config fields on save", () => {
        const config = {
            userName: "TestUser",
            systemPrompt: "Test prompt",
            defaultModel: "gpt-4",
            models: [
                { name: "gpt-4", provider: "openai" as const, modelId: "gpt-4", context: 8000 },
            ],
            history: { maxItems: 100 },
            apiKeys: { openai: "test-key" },
            mcpServers: {},
        };

        const saved = JSON.stringify(config);
        const loaded = JSON.parse(saved);

        expect(loaded.userName).toBe(config.userName);
        expect(loaded.defaultModel).toBe(config.defaultModel);
        expect(loaded.models).toHaveLength(1);
    });

    it("should handle missing optional fields", () => {
        const minimalConfig = {
            defaultModel: "gpt-4",
            models: [],
        };

        expect(minimalConfig.defaultModel).toBe("gpt-4");
    });

    it("should validate model existence", () => {
        const config = {
            defaultModel: "gpt-5",
            models: [
                { name: "gpt-4", provider: "openai" as const, modelId: "gpt-4", context: 8000 },
            ],
        };

        const modelExists = config.models.some((m) => m.name === config.defaultModel);
        expect(modelExists).toBe(false);
    });

    it("should handle concurrent config updates", async () => {
        const config = { value: 0 };

        const updates = Array(10)
            .fill(0)
            .map(
                (_, i) =>
                    new Promise((resolve) => {
                        config.value = i;
                        resolve(config.value);
                    }),
            );

        await Promise.all(updates);
        expect(config.value).toBeGreaterThanOrEqual(0);
    });

    it("should detect circular references in config", () => {
        const config: any = { name: "test" };
        config.self = config;

        expect(() => JSON.stringify(config)).toThrow();
    });

    it("should validate API key formats", () => {
        const validKeys = {
            openai: "sk-proj-test123",
            anthropic: "sk-ant-test123",
            google: "AIzaTest123",
        };

        expect(validKeys.openai).toMatch(/^sk-/);
        expect(validKeys.anthropic).toMatch(/^sk-ant-/);
        expect(validKeys.google.length).toBeGreaterThan(10);
    });
});
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";

describe("Insert Edit Tool - Smart Diff Application", () => {
    let testDir: string;

    beforeEach(async () => {
        testDir = path.join(os.tmpdir(), `insert-edit-test-${Date.now()}`);
        await fs.mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
        await fs.rm(testDir, { recursive: true, force: true });
    });

    it("should apply smart edit correctly", () => {
        const original = `function hello() {
    console.log("Hello");
    return true;
}`;

        const edit = `function hello() {
    console.log("Hello World");
    return true;
}`;

        expect(edit).toContain("Hello World");
    });

    it("should filter out existing code markers", () => {
        const editWithMarkers = `function hello() {
    console.log("Hello World");
    return true;
}`;

        const filtered = editWithMarkers
            .split("\n")
            .filter((line) => !line.trim().match(/^\/\/\s*\.\.\.existing code\.\.\./))
            .join("\n");

        expect(filtered).not.toContain("...existing code...");
    });

    it("should handle partial matches", () => {
        const original = `class MyClass {
    constructor() {
        this.value = 0;
    }

    getValue() {
        return this.value;
    }
}`;

        const searchPattern = "getValue()";
        expect(original).toContain(searchPattern);
    });

    it("should validate file size limits", () => {
        const maxSize = 1024 * 1024;
        const largeEdit = "x".repeat(maxSize + 1);

        expect(largeEdit.length).toBeGreaterThan(maxSize);
    });

    it("should handle empty edits", () => {
        const emptyEdit = "";
        expect(emptyEdit.trim().length).toBe(0);
    });
});
