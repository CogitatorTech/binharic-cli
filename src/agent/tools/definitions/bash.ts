import { z } from "zod";
import { tool } from "ai";
import { spawn } from "child_process";
import { ToolError } from "../../errors/index.js";
import logger from "@/logger.js";

const DANGEROUS_COMMANDS = [
    { pattern: /rm\s+(-[rf]+\s+)*\//i, message: "Dangerous rm command detected" },
    { pattern: /mkfs/i, message: "Filesystem formatting detected" },
    { pattern: /dd\s+if=/i, message: "Direct disk operation detected" },
    { pattern: /:\(\)\{.*:\|:.*/i, message: "Fork bomb pattern detected" },
];

export const bashTool = tool({
    description:
        "Execute a shell command. WARNING: Review security documentation before use in production environments.",
    inputSchema: z
        .object({
            cmd: z.string().describe("The shell command to execute."),
            timeout: z
                .number()
                .int()
                .positive()
                .optional()
                .default(30000)
                .describe("A timeout for the command in milliseconds. Defaults to 30 seconds."),
        })
        .strict(),
    execute: async ({ cmd, timeout = 30000 }: { cmd: string; timeout?: number }) => {
        if (!cmd || cmd.trim().length === 0) {
            throw new ToolError("Cannot execute empty command");
        }

        if (cmd.length > 10000) {
            throw new ToolError("Command exceeds maximum length of 10000 characters");
        }

        for (const { pattern, message } of DANGEROUS_COMMANDS) {
            if (pattern.test(cmd)) {
                logger.warn(`Blocked dangerous command: ${cmd}`);
                throw new ToolError(`${message}. Command blocked for safety.`);
            }
        }

        return new Promise<string>((resolve, reject) => {
            const child = spawn(cmd, {
                cwd: process.cwd(),
                shell: "/bin/bash",
                timeout,
                stdio: ["ignore", "pipe", "pipe"],
            });

            let output = "";
            const MAX_OUTPUT_SIZE = 1024 * 1024;

            const handleData = (data: Buffer) => {
                const text = data.toString();
                output += text;

                if (output.length > MAX_OUTPUT_SIZE) {
                    child.kill();
                    reject(
                        new ToolError(`Output exceeded maximum size of 1MB. Process terminated.`),
                    );
                }
            };

            child.stdout.on("data", handleData);
            child.stderr.on("data", handleData);

            child.on("close", (code) => {
                if (code === 0) {
                    if (output.trim() === "") {
                        resolve("Command executed successfully with no output.");
                    } else {
                        resolve(output);
                    }
                } else {
                    reject(new ToolError(`Command exited with code: ${code}\nOutput:\n${output}`));
                }
            });

            child.on("error", (err) => {
                reject(new ToolError(`Command failed to start: ${err.message}`));
            });
        });
    },
});

export default bashTool;
