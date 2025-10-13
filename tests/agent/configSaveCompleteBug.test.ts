import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { saveConfig, loadConfig } from "@/config.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

describe("Config Save Complete Bug", () => {
    let testConfigDir: string;
    let originalHomedir: typeof os.homedir;

    beforeEach(async () => {
        originalHomedir = os.homedir;
        testConfigDir = await fs.mkdtemp(path.join(os.tmpdir(), "binharic-test-"));
        os.homedir = vi.fn(() => testConfigDir) as typeof os.homedir;
        await fs.mkdir(testConfigDir, { recursive: true });
        await fs.mkdir(path.join(testConfigDir, ".config", "binharic"), { recursive: true });
    });

    afterEach(async () => {
        os.homedir = originalHomedir;
        try {
            await fs.rm(testConfigDir, { recursive: true, force: true });
        } catch (error) {}
    });

    it("should properly save config with error handling", async () => {
        const config = await loadConfig();

        config.defaultModel = "gpt-5-nano";

        await expect(saveConfig(config)).resolves.not.toThrow();

        const savedConfig = await loadConfig();
        expect(savedConfig.defaultModel).toBe("gpt-5-nano");
    });

    it("should handle errors during save and throw with message", async () => {
        const config = await loadConfig();

        const mockWriteFile = vi
            .spyOn(fs, "writeFile")
            .mockRejectedValue(new Error("Mock write error"));

        try {
            await expect(saveConfig(config)).rejects.toThrow("Failed to save configuration");
        } finally {
            mockWriteFile.mockRestore();
        }
    });

    it("should save all config properties", async () => {
        const config = await loadConfig();

        config.userName = "TestUser";
        config.systemPrompt = "Test prompt";
        config.defaultModel = "gpt-4o";

        await saveConfig(config);

        const savedConfig = await loadConfig();
        expect(savedConfig.userName).toBe("TestUser");
        expect(savedConfig.systemPrompt).toBe("Test prompt");
        expect(savedConfig.defaultModel).toBe("gpt-4o");
    });
});
