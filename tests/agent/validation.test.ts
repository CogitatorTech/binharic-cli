import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
    validateFileEdit,
    validateFileCreation,
    validateFileDeletion,
    validate,
} from "@/agent/validation.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

describe("Validation Module", () => {
    let testDir: string;

    beforeEach(async () => {
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), "validation-test-"));
    });

    afterEach(async () => {
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (error) {}
    });

    describe("validateFileEdit", () => {
        it("should validate successful file edit", async () => {
            const filePath = path.join(testDir, "test.txt");
            await fs.writeFile(filePath, "hello world");

            const result = await validateFileEdit(filePath);

            expect(result.success).toBe(true);
            expect(result.message).toContain("verified");
        });

        it("should validate file contains expected content", async () => {
            const filePath = path.join(testDir, "test.txt");
            await fs.writeFile(filePath, "hello world");

            const result = await validateFileEdit(filePath, "hello");

            expect(result.success).toBe(true);
        });

        it("should fail when expected content not found", async () => {
            const filePath = path.join(testDir, "test.txt");
            await fs.writeFile(filePath, "hello world");

            const result = await validateFileEdit(filePath, "missing");

            expect(result.success).toBe(false);
            expect(result.message).toContain("expected content not found");
        });

        it("should fail for non-existent file", async () => {
            const filePath = path.join(testDir, "nonexistent.txt");

            const result = await validateFileEdit(filePath);

            expect(result.success).toBe(false);
        });
    });

    describe("validateFileCreation", () => {
        it("should validate file creation", async () => {
            const filePath = path.join(testDir, "new.txt");
            await fs.writeFile(filePath, "content");

            const result = await validateFileCreation(filePath);

            expect(result.success).toBe(true);
            expect(result.message).toContain("verified");
            expect(result.details?.size).toBeGreaterThan(0);
        });

        it("should fail for non-existent file", async () => {
            const filePath = path.join(testDir, "missing.txt");

            const result = await validateFileCreation(filePath);

            expect(result.success).toBe(false);
            expect(result.message).toContain("not created successfully");
        });
    });

    describe("validateFileDeletion", () => {
        it("should validate file deletion", async () => {
            const filePath = path.join(testDir, "delete-me.txt");
            await fs.writeFile(filePath, "content");
            await fs.unlink(filePath);

            const result = await validateFileDeletion(filePath);

            expect(result.success).toBe(true);
            expect(result.message).toContain("verified");
        });

        it("should fail when file still exists", async () => {
            const filePath = path.join(testDir, "still-here.txt");
            await fs.writeFile(filePath, "content");

            const result = await validateFileDeletion(filePath);

            expect(result.success).toBe(false);
            expect(result.message).toContain("still exists");
        });
    });

    describe("validate", () => {
        it("should validate file-edit strategy", async () => {
            const filePath = path.join(testDir, "edit.txt");
            await fs.writeFile(filePath, "content");

            const result = await validate({
                type: "file-edit",
                filePath,
            });

            expect(result.success).toBe(true);
        });

        it("should validate file-creation strategy", async () => {
            const filePath = path.join(testDir, "created.txt");
            await fs.writeFile(filePath, "content");

            const result = await validate({
                type: "file-creation",
                filePath,
            });

            expect(result.success).toBe(true);
        });

        it("should validate file-deletion strategy", async () => {
            const filePath = path.join(testDir, "deleted.txt");

            const result = await validate({
                type: "file-deletion",
                filePath,
            });

            expect(result.success).toBe(true);
        });

        it("should throw error for missing required parameters", async () => {
            await expect(
                validate({
                    type: "file-edit",
                } as any),
            ).rejects.toThrow("filePath required");
        });
    });
});
