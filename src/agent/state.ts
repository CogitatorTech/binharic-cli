// src/agent/state.ts
// CORRECTED: Changed the tool output property from `text` to `value` to match the AI SDK's expected schema.

import { create } from "zustand";
import logger from "@/logger.js";
import { streamAssistantResponse } from "./llm.js";
import { generateSystemPrompt } from "./systemPrompt.js";
import { runTool } from "./tools/index.js";
import { type Config, HISTORY_PATH, loadConfig, saveConfig } from "@/config.js";
import { FatalError, TransientError } from "./errors.js";
import fsSync from "fs";
import path from "path";
import simpleGit from "simple-git";
import { HistoryItem, ToolRequestItem } from "./history.js";
import type { ModelMessage } from "ai";
import { applyContextWindow } from "./contextWindow.js";

function loadCommandHistory(): string[] {
    try {
        if (!fsSync.existsSync(HISTORY_PATH)) {
            fsSync.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
        }
        const historyContent = fsSync.readFileSync(HISTORY_PATH, "utf-8");
        return historyContent.split("\n").filter(Boolean);
    } catch (error) {
        return [];
    }
}

type AppState = {
    history: HistoryItem[];
    commandHistory: string[];
    commandHistoryIndex: number;
    status: "initializing" | "idle" | "responding" | "tool-request" | "executing-tool" | "error";
    error: string | null;
    config: Config | null;
    helpMenuOpen: boolean;
    branchName: string;
    pendingToolRequest: ToolRequestItem | null;
};

type AppActions = {
    actions: {
        loadInitialConfig: () => Promise<void>;
        updateBranchName: () => Promise<void>;
        startAgent: (input: string) => Promise<void>;
        _runAgentLogic: (retryCount?: number) => Promise<void>;
        confirmToolExecution: () => Promise<void>;
        rejectToolExecution: () => void;
        openHelpMenu: () => void;
        closeHelpMenu: () => void;
        clearOutput: () => void;
        clearCommandHistory: () => void;
        clearError: () => void;
        addCommandToHistory: (command: string) => void;
        getPreviousCommand: () => string | null;
        getNextCommand: () => string | null;
        setSystemPrompt: (prompt: string) => void;
        setModel: (modelName: string) => void;
    };
};

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

export const useStore = create<AppState & AppActions>((set, get) => ({
    history: [],
    commandHistory: loadCommandHistory(),
    commandHistoryIndex: loadCommandHistory().length,
    status: "initializing",
    error: null,
    config: null,
    helpMenuOpen: false,
    branchName: "unknown",
    pendingToolRequest: null,
    actions: {
        loadInitialConfig: async () => {
            logger.info("Loading initial configuration.");
            try {
                const config = await loadConfig();
                set({ config, status: "idle" });
                logger.info("Configuration loaded successfully.");
                await get().actions.updateBranchName();
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : "An unknown error occurred.";
                logger.error(`Failed to load configuration: ${errorMessage}`);
                set({ error: `Failed to load configuration: ${errorMessage}`, status: "error" });
            }
        },
        updateBranchName: async () => {
            logger.info("Updating branch name.");
            try {
                const git = simpleGit();
                const branch = await git.revparse(["--abbrev-ref", "HEAD"]);
                set({ branchName: branch });
                logger.info(`Branch name updated to: ${branch}`);
            } catch (error) {
                logger.warn("Failed to update branch name. Are you in a git repository?");
                set({ branchName: "unknown" });
            }
        },
        openHelpMenu: () => {
            logger.info("Opening help menu.");
            set({ helpMenuOpen: true });
        },
        closeHelpMenu: () => {
            logger.info("Closing help menu.");
            set({ helpMenuOpen: false });
        },
        clearOutput: () => {
            logger.info("Clearing output.");
            set({ history: [] });
        },
        clearCommandHistory: () => {
            logger.info("Clearing command history.");
            set({ commandHistory: [], commandHistoryIndex: 0 });
            try {
                fsSync.writeFileSync(HISTORY_PATH, "");
            } catch (err) {
                logger.error("Failed to clear history file:", err);
                console.error("Failed to clear history file:", err);
            }
        },
        clearError: () => {
            const { status } = get();
            if (status === "error") {
                logger.info("Clearing error.");
                set({ error: null, status: "idle" });
            }
        },
        addCommandToHistory: (command) => {
            logger.info(`Adding command to history: ${command}`);
            const { commandHistory } = get();
            const newCommandHistory = [...commandHistory, command];
            set({
                commandHistory: newCommandHistory,
                commandHistoryIndex: newCommandHistory.length,
            });
            try {
                fsSync.appendFileSync(HISTORY_PATH, command + "\n");
            } catch (err) {
                logger.error("Failed to write to history file:", err);
                console.error("Failed to write to history file:", err);
            }
        },
        getPreviousCommand: () => {
            const { commandHistory, commandHistoryIndex } = get();
            if (commandHistoryIndex > 0) {
                const newIndex = commandHistoryIndex - 1;
                set({ commandHistoryIndex: newIndex });
                return commandHistory[newIndex] ?? null;
            }
            return null;
        },
        getNextCommand: () => {
            const { commandHistory, commandHistoryIndex } = get();
            if (commandHistoryIndex < commandHistory.length - 1) {
                const newIndex = commandHistoryIndex + 1;
                set({ commandHistoryIndex: newIndex });
                return commandHistory[newIndex] ?? null;
            }
            if (commandHistoryIndex === commandHistory.length - 1) {
                set({ commandHistoryIndex: commandHistory.length });
                return "";
            }
            return null;
        },
        setSystemPrompt: (prompt) => {
            logger.info(`Setting system prompt to: ${prompt}`);
            const { config } = get();
            if (config) {
                const newConfig = { ...config, systemPrompt: prompt };
                set({ config: newConfig });
                saveConfig(newConfig);
            }
        },
        setModel: (modelName) => {
            logger.info(`Setting model to: ${modelName}`);
            const { config } = get();
            if (config) {
                const modelExists = config.models.some((m) => m.name === modelName);
                if (modelExists) {
                    const newConfig = { ...config, defaultModel: modelName };
                    set({ config: newConfig });
                    saveConfig(newConfig);
                    logger.info(`Successfully set model to: ${modelName}`);
                } else {
                    logger.error(`Model "${modelName}" not found in config.`);
                    console.error(`Model "${modelName}" not found in config.`);
                }
            }
        },

        startAgent: async (input: string) => {
            if (get().status !== "idle") return;
            const newHistory: HistoryItem[] = [
                ...get().history,
                { role: "user", content: input, id: crypto.randomUUID() },
            ];
            set({ history: newHistory, status: "responding" });
            await get().actions._runAgentLogic();
        },

        confirmToolExecution: async () => {
            const { pendingToolRequest, config } = get();
            if (!pendingToolRequest || !config) return;

            // Prevent race conditions by checking if we're already executing
            if (get().status === "executing-tool") {
                logger.warn("Tool execution already in progress, ignoring duplicate request.");
                return;
            }

            set({ status: "executing-tool", pendingToolRequest: null });

            const toolResults: (HistoryItem | null)[] = await Promise.all(
                pendingToolRequest.calls.map(async (toolCall) => {
                    try {
                        const output = await runTool(
                            { toolName: toolCall.toolName, args: toolCall.input },
                            config,
                        );
                        return {
                            id: crypto.randomUUID(),
                            role: "tool-result",
                            toolCallId: toolCall.toolCallId,
                            toolName: toolCall.toolName,
                            output,
                        } as HistoryItem;
                    } catch (error) {
                        return {
                            id: crypto.randomUUID(),
                            role: "tool-failure",
                            toolCallId: toolCall.toolCallId,
                            toolName: toolCall.toolName,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : "An unknown error occurred",
                        } as HistoryItem;
                    }
                }),
            );

            const filteredResults = toolResults.filter(
                (item): item is HistoryItem => item !== null,
            );

            set((state) => ({
                history: [...state.history, ...filteredResults],
                status: "responding",
            }));
            await get().actions._runAgentLogic();
        },

        rejectToolExecution: () => {
            set((state) => ({
                history: [
                    ...state.history,
                    {
                        id: crypto.randomUUID(),
                        role: "user",
                        content:
                            "Tool call rejected. Please reconsider the task and propose a new plan or ask for clarification.",
                    },
                ],
                status: "responding",
                pendingToolRequest: null,
            }));
            get().actions._runAgentLogic();
        },

        _runAgentLogic: async (retryCount = 0) => {
            try {
                const { history, config } = get();
                if (!config) throw new FatalError("Configuration not loaded.");

                let sdkCompliantHistory = history
                    .map((item): ModelMessage | null => {
                        switch (item.role) {
                            case "user":
                                return { role: "user", content: item.content };
                            case "assistant":
                                return { role: "assistant", content: item.content };
                            case "tool-result": {
                                const outputText =
                                    typeof item.output === "string"
                                        ? item.output
                                        : JSON.stringify(item.output, null, 2);

                                return {
                                    role: "tool",
                                    content: [
                                        {
                                            type: "tool-result",
                                            toolCallId: item.toolCallId,
                                            toolName: item.toolName,
                                            output: {
                                                type: "text",
                                                // CORRECTED: The property name is 'value', not 'text'.
                                                value:
                                                    outputText ||
                                                    "Tool executed successfully with no output.",
                                            },
                                        },
                                    ],
                                };
                            }
                            default:
                                return null;
                        }
                    })
                    .filter(Boolean) as ModelMessage[];

                const modelConfig = config.models.find((m) => m.name === config.defaultModel);
                if (!modelConfig) {
                    throw new FatalError(
                        `Model ${config.defaultModel} not found in configuration.`,
                    );
                }

                sdkCompliantHistory = applyContextWindow(sdkCompliantHistory, modelConfig);

                const systemPrompt = await generateSystemPrompt(config);

                const { textStream, toolCalls: toolCallPartsPromise } =
                    await streamAssistantResponse(sdkCompliantHistory, config, systemPrompt);

                let assistantMessage: HistoryItem | null = null;
                for await (const part of textStream) {
                    if (!assistantMessage) {
                        assistantMessage = {
                            id: crypto.randomUUID(),
                            role: "assistant",
                            content: "",
                        };
                        set((state) => ({ history: [...state.history, assistantMessage!] }));
                    }
                    (assistantMessage.content as string) += part;
                    set((state) => ({ history: [...state.history] }));
                }

                const toolCalls = await toolCallPartsPromise;

                if (toolCalls.length > 0) {
                    const toolRequestItem: ToolRequestItem = {
                        id: crypto.randomUUID(),
                        role: "tool-request",
                        calls: toolCalls,
                    };
                    set((state) => ({
                        history: [...state.history, toolRequestItem],
                        pendingToolRequest: toolRequestItem,
                        status: "tool-request",
                    }));
                } else {
                    set({ status: "idle" });
                }
            } catch (error) {
                const typedError = error as Error;
                if (typedError instanceof TransientError && retryCount < MAX_RETRIES) {
                    const backoff = INITIAL_BACKOFF_MS * 2 ** retryCount;
                    logger.warn(
                        `Transient error caught, retrying in ${backoff}ms... (${retryCount + 1})`,
                    );
                    set({ status: "idle" });
                    setTimeout(() => {
                        set({ status: "responding" });
                        get().actions._runAgentLogic(retryCount + 1);
                    }, backoff);
                    return;
                }
                const finalErrorMessage =
                    typedError instanceof Error ? typedError.message : "An unknown error occurred.";
                logger.error(`Fatal or unhandled error: ${finalErrorMessage}`);
                set({
                    error: finalErrorMessage,
                    status: "error",
                });
            }
        },
    },
}));
