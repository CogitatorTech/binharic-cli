import { z } from "zod";
import { spawn } from "child_process";
import type { ToolDef } from "../common.js";
import { ToolError } from "../../errors.js";

const searchSchema = z.object({
    name: z.literal("search"),
    arguments: z
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
});

async function implementation(args: z.infer<typeof searchSchema>["arguments"]): Promise<string> {
    return new Promise((resolve, reject) => {
        const timeout = args.timeout || 10000;
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
                    `*${args.query}*`,
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

            // Set up timeout
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
                // Ignore stderr for now
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
                            new ToolError(`Command exited with code: ${code}\nOutput:\n${output}`),
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
}

export default {
    schema: searchSchema,
    implementation,
    description: "Search for files by name.",
} satisfies ToolDef<typeof searchSchema>;
