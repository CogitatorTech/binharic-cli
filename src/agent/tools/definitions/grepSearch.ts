// src/agent/tools/definitions/grepSearch.ts
// Text search in workspace files

import { z } from "zod";
import { tool } from "ai";
import { spawn } from "child_process";
import { ToolError } from "../../errors.js";

export const grepSearchTool = tool({
    description: "Search for text patterns in workspace files using grep.",
    inputSchema: z
        .object({
            query: z.string().describe("The pattern to search for in files."),
            includePattern: z
                .string()
                .optional()
                .describe("Search files matching this glob pattern (e.g., '*.ts'). Optional."),
            isRegexp: z
                .boolean()
                .optional()
                .default(false)
                .describe("Whether the query is a regex pattern. Default is false (plain text)."),
        })
        .strict(),
    execute: async ({ query, includePattern, isRegexp = false }) => {
        return new Promise<string>((resolve, reject) => {
            const grepArgs = ["-r", "-n"]; // recursive, line numbers

            if (!isRegexp) {
                grepArgs.push("-F"); // Fixed string (literal search)
            }

            grepArgs.push("--exclude-dir=node_modules");
            grepArgs.push("--exclude-dir=.git");
            grepArgs.push("--exclude-dir=dist");
            grepArgs.push("--exclude-dir=build");

            if (includePattern) {
                grepArgs.push(`--include=${includePattern}`);
            }

            grepArgs.push(query);
            grepArgs.push(".");

            const child = spawn("grep", grepArgs, {
                cwd: process.cwd(),
                shell: false,
                stdio: ["ignore", "pipe", "pipe"],
            });

            let output = "";
            let errorOutput = "";

            child.stdout.on("data", (data) => {
                output += data.toString();
            });

            child.stderr.on("data", (data) => {
                errorOutput += data.toString();
            });

            child.on("close", (code) => {
                // grep returns 0 for matches found, 1 for no matches, 2+ for errors
                if (code === 0) {
                    resolve(formatGrepOutput(output));
                } else if (code === 1) {
                    resolve(`No matches found for: ${query}`);
                } else {
                    reject(new ToolError(`grep command failed with code ${code}\n${errorOutput}`));
                }
            });

            child.on("error", (err) => {
                reject(new ToolError(`Failed to execute grep: ${err.message}`));
            });
        });
    },
});

function formatGrepOutput(output: string): string {
    if (!output.trim()) {
        return "No matches found.";
    }

    const lines = output.trim().split("\n");
    const maxLines = 50; // Limit output to prevent overwhelming the LLM

    if (lines.length > maxLines) {
        const truncated = lines.slice(0, maxLines).join("\n");
        return `${truncated}\n\n... (${lines.length - maxLines} more matches not shown)`;
    }

    return output;
}

export default grepSearchTool;
