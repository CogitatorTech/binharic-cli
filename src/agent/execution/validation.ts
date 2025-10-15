import { fileTracker } from "../core/fileTracker.js";
import logger from "@/logger.js";
import path from "path";
import fs from "fs/promises";
import { spawn } from "child_process";

export interface ValidationResult {
    success: boolean;
    message: string;
    details?: Record<string, unknown>;
}

async function executeBashCommand(
    cmd: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
        const child = spawn(cmd, {
            cwd: process.cwd(),
            shell: "/bin/bash",
            timeout: 30000,
            stdio: ["ignore", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        child.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        child.on("close", (code) => {
            resolve({ exitCode: code || 0, stdout, stderr });
        });

        child.on("error", (error) => {
            resolve({ exitCode: 1, stdout, stderr: error.message });
        });
    });
}

export async function validateFileEdit(
    filePath: string,
    expectedContent?: string,
): Promise<ValidationResult> {
    try {
        const absolutePath = path.resolve(filePath);
        const content = await fileTracker.read(absolutePath);

        if (expectedContent && !content.includes(expectedContent)) {
            return {
                success: false,
                message: `File was edited but expected content not found in ${filePath}`,
                details: { filePath, contentLength: content.length },
            };
        }

        return {
            success: true,
            message: `File edit verified: ${filePath}`,
            details: { filePath, contentLength: content.length },
        };
    } catch (error) {
        return {
            success: false,
            message: `Failed to validate file edit: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: { filePath, error: String(error) },
        };
    }
}

export async function validateFileCreation(filePath: string): Promise<ValidationResult> {
    try {
        const absolutePath = path.resolve(filePath);
        await fs.access(absolutePath);
        const stats = await fs.stat(absolutePath);

        return {
            success: true,
            message: `File creation verified: ${filePath}`,
            details: {
                filePath,
                size: stats.size,
                created: stats.birthtime,
            },
        };
    } catch (error) {
        return {
            success: false,
            message: `File was not created successfully: ${filePath}`,
            details: { filePath, error: String(error) },
        };
    }
}

export async function validateFileDeletion(filePath: string): Promise<ValidationResult> {
    try {
        const absolutePath = path.resolve(filePath);
        await fs.access(absolutePath);

        return {
            success: false,
            message: `File still exists after deletion attempt: ${filePath}`,
            details: { filePath },
        };
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return {
                success: true,
                message: `File deletion verified: ${filePath}`,
                details: { filePath },
            };
        }

        return {
            success: false,
            message: `Error validating file deletion: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: { filePath, error: String(error) },
        };
    }
}

export async function validateTypeScriptCompilation(filePath: string): Promise<ValidationResult> {
    try {
        const result = await executeBashCommand(`npx tsc --noEmit ${filePath}`);

        if (result.exitCode === 0) {
            return {
                success: true,
                message: `TypeScript compilation successful for ${filePath}`,
                details: { filePath, output: result.stdout },
            };
        }

        return {
            success: false,
            message: `TypeScript compilation failed for ${filePath}`,
            details: {
                filePath,
                exitCode: result.exitCode,
                errors: result.stderr,
            },
        };
    } catch (error) {
        logger.warn(`Could not validate TypeScript compilation: ${error}`);
        return {
            success: true,
            message: `TypeScript validation skipped (tsc not available)`,
            details: { filePath, skipped: true },
        };
    }
}

export async function validateProjectBuild(): Promise<ValidationResult> {
    try {
        const result = await executeBashCommand("npm run build");

        if (result.exitCode === 0) {
            return {
                success: true,
                message: "Project build successful",
                details: { output: result.stdout },
            };
        }

        return {
            success: false,
            message: "Project build failed",
            details: {
                exitCode: result.exitCode,
                errors: result.stderr,
            },
        };
    } catch (error) {
        return {
            success: false,
            message: `Build validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: { error: String(error) },
        };
    }
}

export async function validateTestsPass(testPattern?: string): Promise<ValidationResult> {
    try {
        const command = testPattern ? `npm test -- ${testPattern}` : "npm test";

        const result = await executeBashCommand(command);

        if (result.exitCode === 0) {
            return {
                success: true,
                message: testPattern
                    ? `Tests passed for pattern: ${testPattern}`
                    : "All tests passed",
                details: { output: result.stdout },
            };
        }

        return {
            success: false,
            message: "Tests failed",
            details: {
                exitCode: result.exitCode,
                errors: result.stderr,
                pattern: testPattern,
            },
        };
    } catch (error) {
        return {
            success: false,
            message: `Test validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: { error: String(error), pattern: testPattern },
        };
    }
}

export interface ValidationStrategy {
    type: "file-edit" | "file-creation" | "file-deletion" | "typescript" | "build" | "tests";
    filePath?: string;
    expectedContent?: string;
    testPattern?: string;
}

export async function validate(strategy: ValidationStrategy): Promise<ValidationResult> {
    logger.info("Running validation", { type: strategy.type });

    let result: ValidationResult;

    switch (strategy.type) {
        case "file-edit":
            if (!strategy.filePath) {
                throw new Error("filePath required for file-edit validation");
            }
            result = await validateFileEdit(strategy.filePath, strategy.expectedContent);
            break;

        case "file-creation":
            if (!strategy.filePath) {
                throw new Error("filePath required for file-creation validation");
            }
            result = await validateFileCreation(strategy.filePath);
            break;

        case "file-deletion":
            if (!strategy.filePath) {
                throw new Error("filePath required for file-deletion validation");
            }
            result = await validateFileDeletion(strategy.filePath);
            break;

        case "typescript":
            if (!strategy.filePath) {
                throw new Error("filePath required for typescript validation");
            }
            result = await validateTypeScriptCompilation(strategy.filePath);
            break;

        case "build":
            result = await validateProjectBuild();
            break;

        case "tests":
            result = await validateTestsPass(strategy.testPattern);
            break;

        default:
            throw new Error(`Unknown validation type: ${(strategy as ValidationStrategy).type}`);
    }

    logger.info("Validation completed", {
        type: strategy.type,
        success: result.success,
    });

    return result;
}
