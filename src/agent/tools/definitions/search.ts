import { z } from "zod";
import { tool } from "ai";
import { spawn } from "child_process";
import { ToolError } from "../../errors.js";
import type { Config } from "@/config.js";

export const searchTool = tool({
    description: "Search for files by name.",
    inputSchema: z
        .object({
            query: z.string().describe("The query to search for."),
            timeout: z
                .number()
                .int()
                .positive()
                .optional()
                .default(10000)
                .describe("A timeout for the search in milliseconds. Defaults to 10 seconds."),
        })
        .strict(),
    execute: async ({ query, timeout = 10000 }: { query: string; timeout?: number }) => {
        return new Promise<string>((resolve, reject) => {
            let timeoutId: NodeJS.Timeout | null = null;

            try {
                const child = spawn(
                    "find",
                    [
                        "-L",
                        ".",
                        "-type",
                        "f",
                        "-not",
                        "-path",
                        "*.git*",
                        "-name",
                        `*${query}*`,
                        "-print",
                    ],
                    {
                        cwd: process.cwd(),
                        shell: false,
                        stdio: ["ignore", "pipe", "pipe"],
                    },
                );

                let output = "";
                let isResolved = false;

                timeoutId = setTimeout(() => {
                    if (!isResolved) {
                        isResolved = true;
                        child.kill("SIGTERM");
                        reject(new ToolError(`Search timed out after ${timeout}ms`));
                    }
                }, timeout);

                child.stdout.on("data", (data) => {
                    output += data.toString();
                });

                child.stderr.on("data", (data) => {
                    output += data.toString();
                });

                child.on("close", (code) => {
                    if (!isResolved) {
                        isResolved = true;
                        if (timeoutId) clearTimeout(timeoutId);

                        if (code === 0) {
                            resolve(output || "No files found.");
                        } else {
                            reject(
                                new ToolError(
                                    `Command exited with code: ${code}\nOutput:\n${output}`,
                                ),
                            );
                        }
                    }
                });

                child.on("error", (err) => {
                    if (!isResolved) {
                        isResolved = true;
                        if (timeoutId) clearTimeout(timeoutId);
                        reject(new ToolError(`Command failed to start: ${err.message}`));
                    }
                });
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                reject(new ToolError(`Command failed to start: ${message}`));
            }
        });
    },
});

export default searchTool;
