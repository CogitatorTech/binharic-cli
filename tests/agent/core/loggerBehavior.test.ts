import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

describe("Logger behavior in test mode", () => {
    it("should not create log files or directories when NODE_ENV=test", async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "binharic-logger-test-"));
        const overrideDir = path.join(tempDir, "logs-override");

        process.env.NODE_ENV = "test";
        delete process.env.DEBUG_BINHARIC;
        delete process.env.DEBUG_TOBI;
        process.env.BINHARIC_LOG_DIR = overrideDir;

        const mod = await import("@/logger.js");
        const logger = mod.default;
        logger.info("test message");

        expect(fs.existsSync(overrideDir)).toBeFalsy();
    });
});

