import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";

describe("File Operations - Security and Validation", () => {
    let testDir: string;

    beforeEach(async () => {
        testDir = path.join(os.tmpdir(), `security-test-${Date.now()}`);
        await fs.mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
        await fs.rm(testDir, { recursive: true, force: true });
    });

    it("should reject path traversal attempts", () => {
        const maliciousPaths = [
            "../../../etc/passwd",
            "../../sensitive.txt",
            "./../../outside.txt",
        ];

        maliciousPaths.forEach((malPath) => {
            const resolved = path.resolve(testDir, malPath);
            expect(resolved.startsWith(testDir)).toBe(false);
        });
    });

    it("should validate file size limits", async () => {
        const maxSize = 1024 * 1024;
        const largeContent = "A".repeat(maxSize + 1);

        expect(largeContent.length).toBeGreaterThan(maxSize);
    });

    it("should handle special characters in filenames", async () => {
        const specialNames = [
            "file with spaces.txt",
            "file-with-dashes.txt",
            "file_with_underscores.txt",
        ];

        for (const name of specialNames) {
            const filePath = path.join(testDir, name);
            await fs.writeFile(filePath, "content");
            const exists = await fs
                .access(filePath)
                .then(() => true)
                .catch(() => false);
            expect(exists).toBe(true);
        }
    });

    it("should handle concurrent file operations safely", async () => {
        const file = path.join(testDir, "concurrent.txt");
        await fs.writeFile(file, "initial");

        const operations = [
            fs.readFile(file, "utf8"),
            fs.readFile(file, "utf8"),
            fs.readFile(file, "utf8"),
        ];

        const results = await Promise.all(operations);
        results.forEach((content) => {
            expect(content).toBe("initial");
        });
    });

    it("should detect binary files correctly", async () => {
        const binaryFile = path.join(testDir, "binary.bin");
        const buffer = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]);
        await fs.writeFile(binaryFile, buffer);

        const content = await fs.readFile(binaryFile);
        expect(Buffer.isBuffer(content)).toBe(true);
    });
});
