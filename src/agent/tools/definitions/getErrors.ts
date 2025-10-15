// src/agent/tools/definitions/getErrors.ts
// Get TypeScript compilation and linting errors

import { z } from "zod";
import { tool } from "ai";
import { spawn } from "child_process";
import { ToolError } from "../../errors/index.js";
import fs from "fs/promises";
import path from "path";

export const getErrorsTool = tool({
    description: "Get TypeScript compilation and linting errors for specified files.",
    inputSchema: z
        .object({
            filePaths: z
                .array(z.string())
                .describe("Array of absolute file paths to check for errors."),
        })
        .strict(),
    execute: async ({ filePaths }) => {
        try {
            for (const filePath of filePaths) {
                try {
                    await fs.access(filePath);
                } catch {
                    throw new ToolError(`File not found: ${filePath}`);
                }
            }

            const tsconfigPath = await findTsConfig();

            if (!tsconfigPath) {
                return "No TypeScript configuration found. Unable to check for compile errors.";
            }

            const errors = await runTypeScriptCheck(filePaths, tsconfigPath);

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
    },
});

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
            const errors = parseTypeScriptErrors(output, filePaths);
            resolve(errors);
        });

        child.on("error", () => {
            resolve([]);
        });
    });
}

function parseTypeScriptErrors(
    output: string,
    filePaths: string[],
): Array<{ file: string; line: number; column: number; message: string; severity: string }> {
    const errors: Array<{
        file: string;
        line: number;
        column: number;
        message: string;
        severity: string;
    }> = [];

    const lines = output.split("\n");
    const errorPattern = /^(.+)\((\d+),(\d+)\):\s+(error|warning)\s+TS\d+:\s+(.+)$/;

    for (const line of lines) {
        const match = line.match(errorPattern);
        if (match) {
            const [, file, lineNum, col, severity, message] = match;
            if (filePaths.some((fp) => file.includes(fp) || fp.includes(file))) {
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
    const grouped = errors.reduce(
        (acc, err) => {
            if (!acc[err.file]) {
                acc[err.file] = [];
            }
            acc[err.file].push(err);
            return acc;
        },
        {} as Record<string, typeof errors>,
    );

    const parts: string[] = [];

    for (const [file, fileErrors] of Object.entries(grouped)) {
        parts.push(`\n<errors path="${file}">`);
        for (const err of fileErrors) {
            const suggestion = getSuggestionForError(err.message);
            parts.push(
                `<compileError severity="${err.severity.toUpperCase()}" line="${err.line}" column="${err.column}">\n${err.message}${suggestion ? `\n\n💡 Suggestion: ${suggestion}` : ""}\n</compileError>`,
            );
        }
        parts.push(`</errors>`);
    }

    return parts.join("\n");
}

function getSuggestionForError(message: string): string | null {
    // Common TypeScript error patterns with suggestions
    const patterns = [
        {
            pattern: /Property '(.+?)' does not exist on type '(.+?)'/,
            suggestion: (m: RegExpMatchArray) =>
                `Check if property '${m[1]}' is correctly spelled or if type '${m[2]}' needs to be extended. Consider using optional chaining (?.) if the property might not exist.`,
        },
        {
            pattern: /Cannot find name '(.+?)'/,
            suggestion: (m: RegExpMatchArray) =>
                `'${m[1]}' is not defined. Check for typos, missing imports, or if you need to declare this variable.`,
        },
        {
            pattern: /Type '(.+?)' is not assignable to type '(.+?)'/,
            suggestion: (m: RegExpMatchArray) =>
                `Type mismatch detected. You may need to convert '${m[1]}' to '${m[2]}', add a type assertion, or adjust your type definitions.`,
        },
        {
            pattern: /Object is possibly '(null|undefined)'/,
            suggestion: () =>
                `Add a null check or use optional chaining (?.) before accessing this object. Example: obj?.property`,
        },
        {
            pattern: /Argument of type '(.+?)' is not assignable to parameter of type '(.+?)'/,
            suggestion: (m: RegExpMatchArray) =>
                `The argument type doesn't match. Expected '${m[2]}' but got '${m[1]}'. Check the function signature and convert the argument accordingly.`,
        },
        {
            pattern: /'(.+?)' is declared but its value is never read/,
            suggestion: (m: RegExpMatchArray) =>
                `Variable '${m[1]}' is unused. Remove it or prefix with underscore (_${m[1]}) if it's intentionally unused.`,
        },
        {
            pattern: /Parameter '(.+?)' implicitly has an 'any' type/,
            suggestion: (m: RegExpMatchArray) =>
                `Add explicit type annotation for parameter '${m[1]}'. Example: ${m[1]}: string`,
        },
        {
            pattern: /Expected (\d+) arguments?, but got (\d+)/,
            suggestion: (m: RegExpMatchArray) =>
                `Function expects ${m[1]} argument(s) but received ${m[2]}. Check the function signature and provide the correct number of arguments.`,
        },
        {
            pattern: /Cannot find module '(.+?)'/,
            suggestion: (m: RegExpMatchArray) =>
                `Module '${m[1]}' not found. Check if the path is correct, the package is installed (npm install ${m[1]}), or if you need to add file extensions.`,
        },
        {
            pattern: /'await' expressions are only allowed within async functions/,
            suggestion: () =>
                `Add 'async' keyword to the function declaration. Example: async function myFunction() { ... }`,
        },
    ];

    for (const { pattern, suggestion } of patterns) {
        const match = message.match(pattern);
        if (match) {
            return suggestion(match);
        }
    }

    return null;
}

export default getErrorsTool;
