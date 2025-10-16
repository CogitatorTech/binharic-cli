import { z } from "zod";
import { tool } from "ai";
import { type ChildProcess, spawn } from "child_process";
import { ToolError } from "../../errors/index.js";

const sessions = new Map<
    string,
    {
        process: ChildProcess;
        output: string[];
        isBackground: boolean;
        startTime: number;
        timeout?: NodeJS.Timeout;
    }
>();

let sessionCounter = 0;

const MAX_SESSIONS = 10;
const MAX_COMMAND_LENGTH = 10000;
const MAX_OUTPUT_SIZE = 1024 * 1024;
const BACKGROUND_TIMEOUT_MS = 300000;
const MAX_OUTPUT_LINES = 1000;

function cleanupSession(sessionId: string) {
    const session = sessions.get(sessionId);
    if (session) {
        if (session.timeout) {
            clearTimeout(session.timeout);
        }
        if (!session.process.killed) {
            session.process.kill();
        }
        session.process.stdout?.removeAllListeners();
        session.process.stderr?.removeAllListeners();
        session.process.removeAllListeners();
        sessions.delete(sessionId);
    }
}

export function cleanupAllSessions() {
    for (const sessionId of sessions.keys()) {
        cleanupSession(sessionId);
    }
}

export const runInTerminalTool = tool({
    description:
        "Execute shell commands in a persistent terminal session, preserving context across commands.",
    inputSchema: z
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
    execute: async ({ command, explanation, isBackground = false }) => {
        if (!command || command.trim().length === 0) {
            throw new ToolError("Cannot execute empty command. Please provide a valid command.");
        }

        if (command.length > MAX_COMMAND_LENGTH) {
            throw new ToolError(
                `Command exceeds maximum length of ${MAX_COMMAND_LENGTH} characters. ` +
                    `Current length: ${command.length} characters.`,
            );
        }

        if (isBackground && sessions.size >= MAX_SESSIONS) {
            throw new ToolError(
                `Maximum of ${MAX_SESSIONS} concurrent terminal sessions reached. ` +
                    `Please wait for existing sessions to complete or use get_terminal_output to check their status.`,
            );
        }

        const interactiveCommands = [
            "htop",
            "top",
            "vim",
            "nano",
            "less",
            "more",
            "vi",
            "emacs",
            "man",
        ];
        const commandName = command.trim().split(/\s+/)[0];

        if (commandName && interactiveCommands.includes(commandName)) {
            throw new ToolError(
                `Cannot run interactive command '${commandName}' - it requires a real terminal. ` +
                    `Try a non-interactive alternative (e.g., 'ps aux' instead of 'htop', 'cat' instead of 'less').`,
            );
        }

        const dangerousPatterns = [
            {
                pattern: /rm\s+(-[rf]+\s+)*\//i,
                message:
                    "Dangerous rm command detected. Use specific paths and avoid root directories.",
            },
            {
                pattern: /mkfs/i,
                message: "Filesystem formatting command detected. This could destroy data.",
            },
            {
                pattern: /dd\s+if=\/dev\/zero/i,
                message: "Dangerous dd command detected. This could overwrite data.",
            },
            {
                pattern: /:\(\)\{.*:\|:.*/i,
                message: "Fork bomb detected. This could crash the system.",
            },
            {
                pattern: />.*\/dev\/sda/i,
                message: "Direct disk write detected. This could destroy data.",
            },
            {
                pattern: /chmod\s+(-R\s+)?777/i,
                message: "Overly permissive chmod detected. Use more restrictive permissions.",
            },
        ];

        for (const { pattern, message } of dangerousPatterns) {
            if (pattern.test(command)) {
                throw new ToolError(
                    `Blocked potentially dangerous command: ${message}\n` +
                        `If you're sure this is safe, please review and modify the command.`,
                );
            }
        }

        return new Promise<string>((resolve, reject) => {
            const sessionId = `terminal-${++sessionCounter}`;
            const output: string[] = [];
            let outputSize = 0;
            let hasResolved = false;

            const timeout = isBackground ? undefined : 30000;

            const child = spawn(command, {
                cwd: process.cwd(),
                shell: "/bin/bash",
                stdio: ["ignore", "pipe", "pipe"],
                timeout,
            });

            const handleOutput = (data: Buffer) => {
                const text = data.toString();
                outputSize += text.length;

                if (outputSize > MAX_OUTPUT_SIZE) {
                    if (!hasResolved) {
                        hasResolved = true;
                        child.kill();
                        cleanupSession(sessionId);
                        reject(
                            new ToolError(
                                `Command output exceeded maximum size of ${MAX_OUTPUT_SIZE} bytes (1MB). ` +
                                    `Process terminated. Consider redirecting output to a file or using pagination.`,
                            ),
                        );
                    }
                    return;
                }

                if (output.length >= MAX_OUTPUT_LINES) {
                    output.shift();
                }

                output.push(text);
            };

            child.stdout?.on("data", handleOutput);
            child.stderr?.on("data", handleOutput);

            if (isBackground) {
                const backgroundTimeout = setTimeout(() => {
                    if (sessions.has(sessionId)) {
                        cleanupSession(sessionId);
                    }
                }, BACKGROUND_TIMEOUT_MS);

                sessions.set(sessionId, {
                    process: child,
                    output,
                    isBackground: true,
                    startTime: Date.now(),
                    timeout: backgroundTimeout,
                });

                if (!hasResolved) {
                    hasResolved = true;
                    resolve(
                        `Background process started with session ID: ${sessionId}\n${explanation}\n` +
                            `Use get_terminal_output to check its status. Process will auto-terminate after 5 minutes.`,
                    );
                }
            } else {
                child.on("close", (code) => {
                    if (!hasResolved) {
                        hasResolved = true;
                        const fullOutput = output.join("").trim();
                        if (code === 0) {
                            if (fullOutput) {
                                resolve(fullOutput);
                            } else {
                                resolve(
                                    `Command executed successfully with no output.\n${explanation}`,
                                );
                            }
                        } else {
                            reject(
                                new ToolError(
                                    `Command exited with code: ${code}\nOutput:\n${fullOutput || "(no output)"}`,
                                ),
                            );
                        }
                    }
                });

                child.on("error", (err) => {
                    if (!hasResolved) {
                        hasResolved = true;
                        reject(new ToolError(`Command failed to start: ${err.message}`));
                    }
                });
            }
        });
    },
});

export const getTerminalOutputTool = tool({
    description: "Get the output of a terminal command previously started with run_in_terminal.",
    inputSchema: z
        .object({
            id: z.string().describe("The ID of the terminal session to check."),
        })
        .strict(),
    execute: async ({ id }) => {
        if (!id || typeof id !== "string") {
            throw new ToolError("Invalid session ID. Must be a non-empty string.");
        }

        const session = sessions.get(id);

        if (!session) {
            throw new ToolError(
                `No terminal session found with ID: ${id}\n` +
                    `Active sessions: ${sessions.size > 0 ? Array.from(sessions.keys()).join(", ") : "none"}`,
            );
        }

        const output = session.output.join("");
        const exitCode = session.process.exitCode;
        const runTime = Math.round((Date.now() - session.startTime) / 1000);

        if (exitCode !== null) {
            cleanupSession(id);
            return `Process completed with exit code ${exitCode} (ran for ${runTime}s)\n\nOutput:\n${output || "(no output)"}`;
        }

        return `Process is still running (${runTime}s elapsed).\n\nCurrent output:\n${output || "(no output yet)"}`;
    },
});

export default { runInTerminal: runInTerminalTool, getTerminalOutput: getTerminalOutputTool };
