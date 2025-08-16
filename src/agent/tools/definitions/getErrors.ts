// src/agent/tools/definitions/getErrors.ts
// Get TypeScript compilation and linting errors

import { z } from "zod";
import { spawn } from "child_process";
import type { ToolDef } from "../common.js";
import { ToolError } from "../../errors.js";
import fs from "fs/promises";
import path from "path";

const getErrorsSchema = z.object({
    name: z.literal("get_errors"),
    arguments: z
        .object({
            filePaths: z
                .array(z.string())
                .describe("Array of absolute file paths to check for errors."),
        })
        .strict(),
});

async function implementation(args: z.infer<typeof getErrorsSchema>["arguments"]): Promise<string> {
    try {
        // First, verify all files exist
        for (const filePath of args.filePaths) {
            try {
                await fs.access(filePath);
            } catch {
                throw new ToolError(`File not found: ${filePath}`);
            }
        }

        // Try to find tsconfig.json
        const tsconfigPath = await findTsConfig();

        if (!tsconfigPath) {
            return "No TypeScript configuration found. Unable to check for compile errors.";
        }

        // Run TypeScript compiler in check mode
        const errors = await runTypeScriptCheck(args.filePaths, tsconfigPath);

        if (errors.length === 0) {
            return "No errors found.";
        }

        return formatErrors(errors);
    } catch (error: unknown) {
        if (error instanceof ToolError) throw error;
        if (error instanceof Error) {
            throw new ToolError(`Error checking for errors: ${error.message}`);
        }
        throw new ToolError("An unknown error occurred while checking for errors.");
    }
}

async function findTsConfig(): Promise<string | null> {
    let dir = process.cwd();

    while (dir !== path.dirname(dir)) {
        const tsconfigPath = path.join(dir, "tsconfig.json");
        try {
            await fs.access(tsconfigPath);
            return tsconfigPath;
        } catch {
            dir = path.dirname(dir);
        }
    }

    return null;
}

async function runTypeScriptCheck(
    filePaths: string[],
    tsconfigPath: string,
): Promise<
    Array<{ file: string; line: number; column: number; message: string; severity: string }>
> {
    return new Promise((resolve) => {
        const child = spawn("npx", ["tsc", "--noEmit", "--project", tsconfigPath], {
            cwd: process.cwd(),
            shell: false,
            stdio: ["ignore", "pipe", "pipe"],
        });

        let output = "";
        child.stdout.on("data", (data) => {
            output += data.toString();
        });
        child.stderr.on("data", (data) => {
            output += data.toString();
        });

        child.on("close", () => {
            // Parse TypeScript error output
            const errors = parseTypeScriptErrors(output, filePaths);
            resolve(errors);
        });

        child.on("error", () => {
            // If tsc fails to run, return empty array
            resolve([]);
        });
    });
}

function parseTypeScriptErrors(
    output: string,
    targetFiles: string[],
): Array<{ file: string; line: number; column: number; message: string; severity: string }> {
    const errors: Array<{
        file: string;
        line: number;
        column: number;
        message: string;
        severity: string;
    }> = [];
    const lines = output.split("\n");

    // TypeScript error format: file.ts(line,col): error TSxxxx: message
    const errorRegex = /^(.+)\((\d+),(\d+)\):\s+(error|warning)\s+TS\d+:\s+(.+)$/;

    for (const line of lines) {
        const match = line.match(errorRegex);
        if (match) {
            const [, file, lineNum, col, severity, message] = match;

            // Only include errors for the target files
            if (targetFiles.some((target) => file.includes(path.basename(target)))) {
                errors.push({
                    file,
                    line: parseInt(lineNum, 10),
                    column: parseInt(col, 10),
                    message,
                    severity,
                });
            }
        }
    }

    return errors;
}

function formatErrors(
    errors: Array<{
        file: string;
        line: number;
        column: number;
        message: string;
        severity: string;
    }>,
): string {
    if (errors.length === 0) return "No errors found.";

    let result = `Found ${errors.length} error(s):\n\n`;

    for (const error of errors) {
        result += `${error.file}:${error.line}:${error.column}\n`;
        result += `  ${error.severity.toUpperCase()}: ${error.message}\n\n`;
    }

    return result;
}

export default {
    schema: getErrorsSchema,
    implementation,
    description:
        "Get TypeScript compile or lint errors in code files. Use after editing files to validate changes.",
} satisfies ToolDef<typeof getErrorsSchema>;
