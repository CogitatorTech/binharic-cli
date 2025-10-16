import { create } from "zustand";
import { randomUUID } from "crypto";
import logger from "@/logger.js";
import { checkProviderAvailability, streamAssistantResponse } from "../llm/provider.js";
import { generateSystemPrompt } from "./systemPrompt.js";
import { runTool } from "../tools/index.js";
import { type Config, getHistoryPath, loadConfig, type ModelConfig, saveConfig } from "@/config.js";
import { FatalError, TransientError } from "../errors/index.js";
import fsSync from "fs";
import path from "path";
import simpleGit from "simple-git";
import { HistoryItem, ToolRequestItem } from "../context/history.js";
import type { ModelMessage } from "ai";
import { applyContextWindow } from "../context/contextWindow.js";
import type { CheckpointRequest } from "./checkpoints.js";
import { createStreamingTextFilter, finalizeFilteredText } from "../llm/textFilters.js";

const SAFE_AUTO_TOOLS = new Set([
    "read_file",
    "list",
    "search",
    "grep_search",
    "get_errors",
    "get_terminal_output",
    "validate",
    "read_multiple_files",
    "git_status",
    "git_log",
    "git_diff",
]);

function loadCommandHistory(): string[] {
    try {
        const HISTORY_PATH = getHistoryPath();
        if (!fsSync.existsSync(HISTORY_PATH)) {
            fsSync.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
        }
        const historyContent = fsSync.readFileSync(HISTORY_PATH, "utf-8");
        return historyContent.split("\n").filter(Boolean);
    } catch (error) {
        return [];
    }
}

function validateModelApiKey(modelConfig: ModelConfig, config: Config): void {
    if (modelConfig.provider === "ollama") {
        logger.info("Using Ollama (local) - no API key validation needed");
        return;
    }

    const keyName =
        config.apiKeys?.[modelConfig.provider] || `${modelConfig.provider.toUpperCase()}_API_KEY`;
    const apiKey = process.env[keyName];

    if (!apiKey || apiKey.trim() === "") {
        const providerNames: Record<string, string> = {
            openai: "OpenAI",
            google: "Google AI",
            anthropic: "Anthropic (Claude)",
        };

        logger.warn(
            `API key not found for ${modelConfig.provider}. ` +
                `Expected environment variable: ${keyName}. ` +
                `Model: ${modelConfig.name}, Provider: ${providerNames[modelConfig.provider]}`,
        );
    } else {
        logger.info(`API key found for ${modelConfig.provider}`);
    }
}

type SessionMetrics = {
    sessionId: string;
    startedAt: number;
    llmRequests: number;
    llmApiTimeMs: number;
    toolCallsSuccess: number;
    toolCallsFailure: number;
    toolTimeMs: number;
    modelUsage: Record<string, { provider: string; modelId: string; requests: number }>;
};

type AppState = {
    history: HistoryItem[];
    commandHistory: string[];
    commandHistoryIndex: number;
    status:
        | "initializing"
        | "idle"
        | "responding"
        | "tool-request"
        | "checkpoint-request"
        | "executing-tool"
        | "error"
        | "interrupted";
    error: string | null;
    config: Config | null;
    helpMenuOpen: boolean;
    branchName: string;
    pendingToolRequest: ToolRequestItem | null;
    pendingCheckpoint: CheckpointRequest | null;
    contextFiles: string[];
    // New: session metrics and exit summary flag
    metrics: SessionMetrics;
    showExitSummary: boolean;
};

type AppActions = {
    actions: {
        loadInitialConfig: () => Promise<void>;
        updateBranchName: () => Promise<void>;
        startAgent: (input: string) => Promise<void>;
        _runAgentLogic: (retryCount?: number) => Promise<void>;
        stopAgent: () => void;
        confirmToolExecution: () => Promise<void>;
        rejectToolExecution: () => void;
        confirmCheckpoint: () => void;
        rejectCheckpoint: () => void;
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
        addContextFile: (path: string) => void;
        clearContextFiles: () => void;
        // New: exit flow
        beginExit: () => void;
    };
};

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const MAX_CONSECUTIVE_ERRORS = 5;

let consecutiveErrors = 0;
let activeStreamTimeout: NodeJS.Timeout | null = null;
let isAgentRunning = false;
let shouldStopAgent = false;
let agentLockTimestamp = 0;
const AGENT_LOCK_TIMEOUT_MS = 300000;

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
    pendingCheckpoint: null,
    contextFiles: [],
    metrics: {
        sessionId: randomUUID(),
        startedAt: Date.now(),
        llmRequests: 0,
        llmApiTimeMs: 0,
        toolCallsSuccess: 0,
        toolCallsFailure: 0,
        toolTimeMs: 0,
        modelUsage: {},
    },
    showExitSummary: false,
    actions: {
        loadInitialConfig: async () => {
            logger.info("Loading initial configuration.");
            try {
                const config = await loadConfig();
                set({ config, status: "idle" });
                await get().actions.updateBranchName();

                logger.info("Checking provider availability...");
                const providerCheck = await checkProviderAvailability(config);

                if (!providerCheck.available) {
                    const technicalDetails =
                        `No LLM providers are available. ` +
                        `Unavailable providers: ${providerCheck.unavailableProviders.join(", ")}`;

                    logger.error(technicalDetails);

                    const userMessage = `No LLM providers configured. Please check logs for details.`;

                    set({ error: userMessage, status: "error" });
                    process.exit(1);
                }

                logger.info(`Available providers: ${providerCheck.availableProviders.join(", ")}`);

                if (providerCheck.unavailableProviders.length > 0) {
                    logger.warn(
                        `Unavailable providers: ${providerCheck.unavailableProviders.join(", ")}`,
                    );
                }

                const modelConfig = config.models.find((m) => m.name === config.defaultModel);
                if (modelConfig) {
                    validateModelApiKey(modelConfig, config);
                }

                const autoContextFiles = ["BINHARIC.md"]
                    .map((p) => path.resolve(p))
                    .filter((p) => fsSync.existsSync(p));
                if (autoContextFiles.length > 0) {
                    set({ contextFiles: autoContextFiles });
                }
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
                const HISTORY_PATH = getHistoryPath();
                fsSync.writeFileSync(HISTORY_PATH, "");
            } catch (err) {
                logger.error("Failed to clear history file:", err);
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
                const HISTORY_PATH = getHistoryPath();
                fsSync.appendFileSync(HISTORY_PATH, command + "\n");
            } catch (err) {
                logger.error("Failed to write to history file:", err);
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
                saveConfig(newConfig).catch((err) => {
                    logger.error("Failed to save config after setting system prompt:", err);
                });
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
                    saveConfig(newConfig).catch((err) => {
                        logger.error("Failed to save config after setting model:", err);
                    });
                    logger.info(`Successfully set model to: ${modelName}`);
                } else {
                    logger.error(`Model "${modelName}" not found in config.`);
                }
            }
        },
        addContextFile: (p: string) => {
            const abs = path.resolve(p);
            if (!fsSync.existsSync(abs)) {
                logger.warn(`Context file not found: ${abs}`);
                return;
            }
            const current = get().contextFiles;
            if (!current.includes(abs)) set({ contextFiles: [...current, abs] });
        },
        clearContextFiles: () => set({ contextFiles: [] }),

        beginExit: () => {
            logger.info("Exit requested - showing summary");
            set({ showExitSummary: true });
        },

        startAgent: async (input: string) => {
            if (get().status !== "idle") {
                logger.warn("Agent already running, ignoring new start request");
                return;
            }

            const now = Date.now();
            if (isAgentRunning) {
                if (now - agentLockTimestamp > AGENT_LOCK_TIMEOUT_MS) {
                    logger.warn("Agent lock timeout detected, forcing reset");
                    isAgentRunning = false;
                } else {
                    logger.warn("Agent logic already executing, ignoring duplicate request");
                    return;
                }
            }

            agentLockTimestamp = now;
            const newHistory: HistoryItem[] = [
                ...get().history,
                { role: "user", content: input, id: randomUUID() },
            ];
            set({ history: newHistory, status: "responding" });
            await get().actions._runAgentLogic();
        },

        stopAgent: () => {
            logger.info("Stopping agent...");
            shouldStopAgent = true;

            const currentStatus = get().status;
            if (currentStatus === "responding" || currentStatus === "executing-tool") {
                set({ status: "interrupted" });
                logger.info(
                    "Agent stop requested - will complete when streaming or execution ends",
                );
            }
        },

        confirmToolExecution: async () => {
            const { pendingToolRequest, config } = get();
            if (!pendingToolRequest || !config) return;

            if (get().status === "executing-tool") {
                logger.warn("Tool execution already in progress, ignoring duplicate request.");
                return;
            }

            set({ status: "executing-tool", pendingToolRequest: null });

            const toolResults: HistoryItem[] = await Promise.all(
                pendingToolRequest.calls.map(async (toolCall) => {
                    if (shouldStopAgent) {
                        return {
                            id: randomUUID(),
                            role: "tool-failure",
                            toolCallId: toolCall.toolCallId,
                            toolName: toolCall.toolName,
                            error: "Execution cancelled by user",
                        } as HistoryItem;
                    }
                    const t0 = Date.now();
                    try {
                        const output = await runTool(
                            {
                                toolName: toolCall.toolName,
                                args: (toolCall as { args?: Record<string, unknown> }).args || {},
                            },
                            config,
                        );
                        const dt = Date.now() - t0;
                        {
                            const current = get();
                            set({
                                metrics: {
                                    ...current.metrics,
                                    toolCallsSuccess: current.metrics.toolCallsSuccess + 1,
                                    toolTimeMs: current.metrics.toolTimeMs + dt,
                                },
                            });
                        }
                        return {
                            id: randomUUID(),
                            role: "tool-result",
                            toolCallId: toolCall.toolCallId,
                            toolName: toolCall.toolName,
                            output,
                        } as HistoryItem;
                    } catch (error) {
                        const dt2 = Date.now() - t0;
                        {
                            const current2 = get();
                            set({
                                metrics: {
                                    ...current2.metrics,
                                    toolCallsFailure: current2.metrics.toolCallsFailure + 1,
                                    toolTimeMs: current2.metrics.toolTimeMs + dt2,
                                },
                            });
                        }
                        return {
                            id: randomUUID(),
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

            if (shouldStopAgent) {
                set((state) => ({
                    history: [
                        ...state.history,
                        ...toolResults,
                        {
                            id: randomUUID(),
                            role: "assistant",
                            content:
                                "[Interrupted by user - The Omnissiah acknowledges your command]",
                        },
                    ],
                    status: "idle",
                }));
                shouldStopAgent = false;
                isAgentRunning = false;
                agentLockTimestamp = 0;
                return;
            }

            set((state) => ({
                history: [...state.history, ...toolResults],
                status: "responding",
            }));
            await get().actions._runAgentLogic();
        },

        rejectToolExecution: () => {
            set((state) => ({
                history: [
                    ...state.history,
                    {
                        id: randomUUID(),
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

        confirmCheckpoint: () => {
            logger.info("Checkpoint confirmed by user");
            set({ pendingCheckpoint: null, status: "tool-request" });
        },

        rejectCheckpoint: () => {
            logger.info("Checkpoint rejected by user");
            set((state) => ({
                history: [
                    ...state.history,
                    {
                        id: randomUUID(),
                        role: "user",
                        content:
                            "Operation rejected by user. The Omnissiah has denied this action. Please propose an alternative approach or ask for clarification.",
                    },
                ],
                status: "responding",
                pendingCheckpoint: null,
                pendingToolRequest: null,
            }));
            get().actions._runAgentLogic();
        },

        _runAgentLogic: async (retryCount = 0) => {
            if (isAgentRunning) {
                logger.warn("Agent logic already running, skipping duplicate execution");
                return;
            }

            isAgentRunning = true;
            agentLockTimestamp = Date.now();

            try {
                await _runAgentLogicInternal(retryCount, get, set);
            } finally {
                isAgentRunning = false;
                agentLockTimestamp = 0;
            }
        },
    },
}));

async function _runAgentLogicInternal(
    retryCount: number,
    get: () => AppState & AppActions,
    set: (partial: Partial<AppState>) => void,
) {
    if (activeStreamTimeout) {
        clearTimeout(activeStreamTimeout);
        activeStreamTimeout = null;
    }

    const startHistoryLength = get().history.length;

    let apiStart = 0;
    let apiCounted = false;

    try {
        const { history, config } = get();
        if (!config) throw new FatalError("Configuration not loaded.");

        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            throw new FatalError(
                "Too many consecutive errors. Please check your configuration and API keys.",
            );
        }

        let sdkCompliantHistory = history
            .map((item): ModelMessage | null => {
                switch (item.role) {
                    case "user":
                        return { role: "user", content: item.content };
                    case "assistant": {
                        if (typeof item.content === "string") {
                            return { role: "assistant", content: item.content };
                        }
                        return { role: "assistant", content: item.content };
                    }
                    case "tool-request": {
                        return {
                            role: "assistant",
                            content: item.calls.map((call) => {
                                const args =
                                    (call as { args?: Record<string, unknown> }).args || {};
                                return {
                                    type: "tool-call" as const,
                                    toolCallId: call.toolCallId,
                                    toolName: call.toolName,
                                    args,
                                    input: args,
                                };
                            }),
                        };
                    }
                    case "tool-result": {
                        const outputText =
                            typeof item.output === "string"
                                ? item.output
                                : JSON.stringify(item.output, null, 2);

                        return {
                            role: "tool",
                            content: [
                                {
                                    type: "tool-result" as const,
                                    toolCallId: item.toolCallId,
                                    toolName: item.toolName,
                                    output: {
                                        type: "text" as const,
                                        value:
                                            outputText ||
                                            "Tool executed successfully with no output.",
                                    },
                                },
                            ],
                        };
                    }
                    case "tool-failure": {
                        return {
                            role: "tool",
                            content: [
                                {
                                    type: "tool-result" as const,
                                    toolCallId: item.toolCallId,
                                    toolName: item.toolName,
                                    output: {
                                        type: "text" as const,
                                        value: `Error: ${item.error}`,
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
            throw new FatalError(`Model ${config.defaultModel} not found in configuration.`);
        }

        // Record model usage and increment request count
        {
            const current = get();
            const mu = { ...current.metrics.modelUsage } as AppState["metrics"]["modelUsage"];
            const key = modelConfig.name;
            mu[key] = mu[key]
                ? { ...mu[key], requests: mu[key].requests + 1 }
                : { provider: modelConfig.provider, modelId: modelConfig.modelId, requests: 1 };
            set({
                metrics: {
                    ...current.metrics,
                    llmRequests: current.metrics.llmRequests + 1,
                    modelUsage: mu,
                },
            });
        }

        sdkCompliantHistory = applyContextWindow(sdkCompliantHistory, modelConfig);

        const systemPrompt = await generateSystemPrompt(config);

        apiStart = Date.now();
        const streamResult = await streamAssistantResponse(
            sdkCompliantHistory,
            config,
            systemPrompt,
        );
        const textStream = streamResult.textStream;
        const toolCallsPromise = streamResult.toolCalls;

        let assistantMessage: HistoryItem | null = null;
        const STREAM_TIMEOUT_MS = 120000;

        const resetStreamTimeout = () => {
            if (activeStreamTimeout) {
                clearTimeout(activeStreamTimeout);
            }
            activeStreamTimeout = setTimeout(() => {
                activeStreamTimeout = null;
                throw new TransientError("Stream timeout - no response from LLM for 2 minutes");
            }, STREAM_TIMEOUT_MS);
        };

        resetStreamTimeout();
        const textFilter = createStreamingTextFilter();

        try {
            for await (const part of textStream) {
                if (shouldStopAgent) {
                    logger.info("Agent interrupted by user");
                    shouldStopAgent = false;

                    if (activeStreamTimeout) {
                        clearTimeout(activeStreamTimeout);
                        activeStreamTimeout = null;
                    }

                    set({
                        status: "idle",
                        history: [
                            ...get().history,
                            {
                                id: randomUUID(),
                                role: "assistant",
                                content:
                                    "[Interrupted by user - The Omnissiah acknowledges your command]",
                            },
                        ],
                    });

                    // Count API time until interruption
                    if (apiStart && !apiCounted) {
                        const current = get();
                        const dt = Date.now() - apiStart;
                        set({
                            metrics: {
                                ...current.metrics,
                                llmApiTimeMs: current.metrics.llmApiTimeMs + dt,
                            },
                        });
                        apiCounted = true;
                    }
                    return;
                }

                resetStreamTimeout();

                if (!assistantMessage) {
                    assistantMessage = {
                        id: randomUUID(),
                        role: "assistant",
                        content: "",
                    };
                    set({ history: [...get().history, assistantMessage] });
                }

                const filteredPart = textFilter(part);
                if (filteredPart) {
                    (assistantMessage.content as string) += filteredPart;
                    set({ history: [...get().history] });
                }
            }
        } finally {
            if (activeStreamTimeout) {
                clearTimeout(activeStreamTimeout);
                activeStreamTimeout = null;
            }

            if (assistantMessage && typeof assistantMessage.content === "string") {
                const flushedContent = textFilter.flush();
                if (flushedContent) {
                    assistantMessage.content += flushedContent;
                }
                assistantMessage.content = finalizeFilteredText(assistantMessage.content);
                set({ history: [...get().history] });
            }
            // After streaming completes, add API time once
            if (apiStart && !apiCounted) {
                const current = get();
                const dt = Date.now() - apiStart;
                set({
                    metrics: {
                        ...current.metrics,
                        llmApiTimeMs: current.metrics.llmApiTimeMs + dt,
                    },
                });
                apiCounted = true;
            }
        }

        if (shouldStopAgent) {
            logger.info("Agent interrupted by user after streaming");
            shouldStopAgent = false;

            const currentStatus = get().status;
            if (currentStatus !== "idle") {
                set({ status: "idle" });
            }
            return;
        }

        const toolCalls = await toolCallsPromise;

        if (toolCalls.length > 0) {
            logger.info(`Received ${toolCalls.length} tool calls from LLM`);

            const validToolCalls = toolCalls
                .filter((call) => {
                    if (!call.toolCallId || !call.toolName) {
                        logger.warn(`Invalid tool call structure: ${JSON.stringify(call)}`);
                        return false;
                    }
                    return true;
                })
                .map((call) => ({
                    ...call,
                    args: ("args" in call && call.args) || ("input" in call && call.input) || {},
                }));

            // Rewrite create -> edit when file exists to avoid error and meet test expectations
            for (const call of validToolCalls) {
                if (call.toolName === "create") {
                    const args = (call as { args: Record<string, unknown> }).args || {};
                    const p = (args["path"] as string) || (args["filePath"] as string) || undefined;
                    const content = (args["content"] as string) || undefined;
                    if (p && fsSync.existsSync(path.resolve(p)) && typeof content === "string") {
                        (call as { toolName: string }).toolName = "edit";
                        (call as { args: Record<string, unknown> }).args = {
                            path: p,
                            edit: { type: "overwrite", content },
                        } as Record<string, unknown>;
                    }
                }
            }

            const autoExecutedCalls = [] as typeof validToolCalls;
            const autoResults: HistoryItem[] = [];
            const pendingCalls: typeof validToolCalls = [];

            for (const toolCall of validToolCalls) {
                if (SAFE_AUTO_TOOLS.has(toolCall.toolName)) {
                    autoExecutedCalls.push(toolCall);
                    const t0 = Date.now();
                    try {
                        const output = await runTool(
                            {
                                toolName: toolCall.toolName,
                                args: (toolCall as { args?: Record<string, unknown> }).args || {},
                            },
                            config,
                        );
                        const dt3 = Date.now() - t0;
                        {
                            const current3 = get();
                            set({
                                metrics: {
                                    ...current3.metrics,
                                    toolCallsSuccess: current3.metrics.toolCallsSuccess + 1,
                                    toolTimeMs: current3.metrics.toolTimeMs + dt3,
                                },
                            });
                        }
                        autoResults.push({
                            id: randomUUID(),
                            role: "tool-result",
                            toolCallId: toolCall.toolCallId,
                            toolName: toolCall.toolName,
                            output,
                        });
                    } catch (error) {
                        const dt4 = Date.now() - t0;
                        {
                            const current4 = get();
                            set({
                                metrics: {
                                    ...current4.metrics,
                                    toolCallsFailure: current4.metrics.toolCallsFailure + 1,
                                    toolTimeMs: current4.metrics.toolTimeMs + dt4,
                                },
                            });
                        }
                        autoResults.push({
                            id: randomUUID(),
                            role: "tool-failure",
                            toolCallId: toolCall.toolCallId,
                            toolName: toolCall.toolName,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : "An unknown error occurred",
                        });
                    }
                } else {
                    pendingCalls.push(toolCall);
                }
            }

            if (autoExecutedCalls.length > 0) {
                const autoToolRequestItem: ToolRequestItem = {
                    id: randomUUID(),
                    role: "tool-request",
                    calls: autoExecutedCalls,
                };
                set({
                    history: [...get().history, autoToolRequestItem, ...autoResults],
                    status: "responding",
                });
                isAgentRunning = false;
                await get().actions._runAgentLogic();
                return;
            }

            if (pendingCalls.length > 0) {
                const toolRequestItem: ToolRequestItem = {
                    id: randomUUID(),
                    role: "tool-request",
                    calls: pendingCalls,
                };
                set({
                    history: [...get().history, toolRequestItem],
                    pendingToolRequest: toolRequestItem,
                    status: "tool-request",
                });
            } else {
                set({ status: "idle" });
            }
        } else {
            set({ status: "idle" });
        }

        consecutiveErrors = 0;
    } catch (error: unknown) {
        if (activeStreamTimeout) {
            clearTimeout(activeStreamTimeout);
            activeStreamTimeout = null;
        }

        const currentHistory = get().history;
        if (currentHistory.length > startHistoryLength) {
            logger.warn(
                `Rolling back ${currentHistory.length - startHistoryLength} history items due to error`,
            );
            set({ history: currentHistory.slice(0, startHistoryLength) });
        }

        const typedError = error as Error;

        if (typedError instanceof TransientError && retryCount < MAX_RETRIES) {
            const backoff = INITIAL_BACKOFF_MS * 2 ** retryCount;
            logger.warn(
                `Transient error caught, retrying in ${backoff}ms... (${retryCount + 1}/${MAX_RETRIES})`,
            );
            consecutiveErrors++;
            set({ status: "idle" });
            setTimeout(() => {
                set({ status: "responding" });
                get().actions._runAgentLogic(retryCount + 1);
            }, backoff);
            return;
        }

        consecutiveErrors++;
        isAgentRunning = false;
        agentLockTimestamp = 0;
        shouldStopAgent = false;

        const finalErrorMessage = typedError.message;
        logger.error(`Fatal or unhandled error: ${finalErrorMessage}`);
        set({
            error: finalErrorMessage,
            status: "error",
        });
    }
}
