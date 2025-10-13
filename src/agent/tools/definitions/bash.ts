import { z } from "zod";
import { spawn } from "child_process";
import type { ToolDef } from "../common.js";
import { ToolError } from "../../errors.js";

const bashSchema = z.object({
    name: z.literal("bash"),
    arguments: z
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
});

async function implementation(args: z.infer<typeof bashSchema>["arguments"]): Promise<string> {
    return new Promise((resolve, reject) => {
        const child = spawn(args.cmd, {
            cwd: process.cwd(),
            shell: "/bin/bash",
            timeout: args.timeout,
            stdio: ["ignore", "pipe", "pipe"],
        });

        let output = "";
        child.stdout.on("data", (data) => {
            output += data.toString();
        });
        child.stderr.on("data", (data) => {
            output += data.toString();
        });

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
}

export default {
    schema: bashSchema,
    implementation,
    description:
        "Execute a shell command. WARNING: Review security documentation before use in production environments.",
} satisfies ToolDef<typeof bashSchema>;
