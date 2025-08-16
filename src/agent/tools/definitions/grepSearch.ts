// src/agent/tools/definitions/grepSearch.ts
// Text search in workspace files

import { z } from "zod";
import { spawn } from "child_process";
import type { ToolDef } from "../common.js";
import { ToolError } from "../../errors.js";

const grepSearchSchema = z.object({
    name: z.literal("grep_search"),
    arguments: z
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
});

async function implementation(
    args: z.infer<typeof grepSearchSchema>["arguments"],
): Promise<string> {
    return new Promise((resolve, reject) => {
        const grepArgs = ["-r", "-n"]; // recursive, line numbers

        if (!args.isRegexp) {
            grepArgs.push("-F"); // Fixed string (literal search)
        }

        grepArgs.push("--exclude-dir=node_modules");
        grepArgs.push("--exclude-dir=.git");
        grepArgs.push("--exclude-dir=dist");
        grepArgs.push("--exclude-dir=build");

        if (args.includePattern) {
            grepArgs.push(`--include=${args.includePattern}`);
        }

        grepArgs.push(args.query);
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
                resolve(`No matches found for: ${args.query}`);
            } else {
                reject(new ToolError(`grep command failed with code ${code}\n${errorOutput}`));
            }
        });

        child.on("error", (err) => {
            reject(new ToolError(`Failed to execute grep: ${err.message}`));
        });
    });
}

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

export default {
    schema: grepSearchSchema,
    implementation,
    description:
        "Search for text content in workspace files. Use when you know the exact string you're looking for.",
} satisfies ToolDef<typeof grepSearchSchema>;
