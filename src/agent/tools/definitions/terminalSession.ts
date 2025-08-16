// src/agent/tools/definitions/terminal_session.ts
// Persistent terminal session management

import { z } from "zod";
import { spawn, type ChildProcess } from "child_process";
import type { ToolDef } from "../common.js";
import { ToolError } from "../../errors.js";

// Global session storage
const sessions = new Map<
    string,
    {
        process: ChildProcess;
        output: string[];
        isBackground: boolean;
    }
>();

let sessionCounter = 0;

const runInTerminalSchema = z.object({
    name: z.literal("run_in_terminal"),
    arguments: z
        .object({
            command: z.string().describe("The command to run in the terminal."),
            explanation: z
                .string()
                .describe("A one-sentence description of what the command does."),
            isBackground: z
                .boolean()
                .optional()
                .default(false)
                .describe(
                    "Whether the command starts a background process. If true, returns a session ID for later retrieval.",
                ),
        })
        .strict(),
});

async function runInTerminalImplementation(
    args: z.infer<typeof runInTerminalSchema>["arguments"],
): Promise<string> {
    return new Promise((resolve, reject) => {
        const sessionId = `terminal-${++sessionCounter}`;
        const output: string[] = [];

        const child = spawn(args.command, {
            cwd: process.cwd(),
            shell: "/bin/bash",
            stdio: ["ignore", "pipe", "pipe"],
        });

        child.stdout.on("data", (data) => {
            const text = data.toString();
            output.push(text);
        });

        child.stderr.on("data", (data) => {
            const text = data.toString();
            output.push(text);
        });

        if (args.isBackground) {
            // Store session for later retrieval
            sessions.set(sessionId, {
                process: child,
                output,
                isBackground: true,
            });

            // Return immediately with session ID
            resolve(
                `Background process started with session ID: ${sessionId}\n${args.explanation}\nUse get_terminal_output to check its status.`,
            );
        } else {
            // Wait for completion
            child.on("close", (code) => {
                const fullOutput = output.join("");
                if (code === 0) {
                    resolve(fullOutput || `Command executed successfully: ${args.explanation}`);
                } else {
                    reject(
                        new ToolError(`Command exited with code: ${code}\nOutput:\n${fullOutput}`),
                    );
                }
            });

            child.on("error", (err) => {
                reject(new ToolError(`Command failed to start: ${err.message}`));
            });
        }
    });
}

const getTerminalOutputSchema = z.object({
    name: z.literal("get_terminal_output"),
    arguments: z
        .object({
            id: z.string().describe("The ID of the terminal session to check."),
        })
        .strict(),
});

async function getTerminalOutputImplementation(
    args: z.infer<typeof getTerminalOutputSchema>["arguments"],
): Promise<string> {
    const session = sessions.get(args.id);

    if (!session) {
        throw new ToolError(`No terminal session found with ID: ${args.id}`);
    }

    const output = session.output.join("");
    const exitCode = session.process.exitCode;

    if (exitCode !== null) {
        // Process has completed
        sessions.delete(args.id);
        return `Process completed with exit code ${exitCode}\n\nOutput:\n${output}`;
    }

    return `Process is still running.\n\nCurrent output:\n${output}`;
}

export const runInTerminal = {
    schema: runInTerminalSchema,
    implementation: runInTerminalImplementation,
    description:
        "Execute shell commands in a persistent terminal session, preserving context across commands.",
} satisfies ToolDef<typeof runInTerminalSchema>;

export const getTerminalOutput = {
    schema: getTerminalOutputSchema,
    implementation: getTerminalOutputImplementation,
    description: "Get the output of a terminal command previously started with run_in_terminal.",
} satisfies ToolDef<typeof getTerminalOutputSchema>;
