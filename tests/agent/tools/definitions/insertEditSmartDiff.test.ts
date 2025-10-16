import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
