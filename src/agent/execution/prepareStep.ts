import { createLlmProvider } from "../llm/provider.js";
import type { Config } from "@/config.js";
import logger from "@/logger.js";

type PrepareStepHandler = (params: {
    messages: any[];
    stepNumber: number;
    steps: any[];
    model: any;
}) => {
    messages?: any[];
    model?: any;
    system?: string;
    activeTools?: Array<
        | "search"
        | "edit"
        | "read_file"
        | "list"
        | "create"
        | "bash"
        | "fetch"
        | "mcp"
        | "insert_edit_into_file"
        | "run_in_terminal"
        | "get_terminal_output"
        | "get_errors"
        | "grep_search"
        | "validate"
        | "execute_workflow"
    >;
    toolChoice?: any;
};

export function createContextManager(maxMessages: number = 20): PrepareStepHandler {
    return ({ messages }) => {
        if (messages.length > maxMessages) {
            logger.info(
                `Context management: trimming ${messages.length} to ${maxMessages} messages`,
            );

            return {
                messages: [messages[0], ...messages.slice(-maxMessages + 1)],
            };
        }
        return {};
    };
}

export function createDynamicModelSelector(
    config: Config,
    strongModelName: string,
    switchAtStep: number = 3,
): PrepareStepHandler {
    return ({ stepNumber, messages }) => {
        if (stepNumber >= switchAtStep && messages.length > 10) {
            const modelConfig = config.models.find((m) => m.name === strongModelName);
            if (modelConfig) {
                logger.info(
                    `Switching to stronger model: ${strongModelName} at step ${stepNumber}`,
                );
                return {
                    model: createLlmProvider(modelConfig, config),
                };
            }
        }
        return {};
    };
}

export function createPhaseBasedToolSelector(): PrepareStepHandler {
    return ({ stepNumber }) => {
        if (stepNumber <= 2) {
            logger.debug("Phase 1: Information gathering");
            return {
                activeTools: ["read_file", "list", "search", "grep_search", "get_errors"],
                toolChoice: "auto",
            };
        }

        if (stepNumber <= 5) {
            logger.debug("Phase 2: Analysis and planning");
            return {
                activeTools: ["read_file", "get_errors", "execute_workflow", "validate"],
                toolChoice: "auto",
            };
        }

        if (stepNumber <= 10) {
            logger.debug("Phase 3: Execution");
            return {
                activeTools: [
                    "read_file",
                    "create",
                    "edit",
                    "insert_edit_into_file",
                    "validate",
                    "get_errors",
                ],
                toolChoice: "auto",
            };
        }

        logger.debug("Phase 4: Verification");
        return {
            activeTools: ["validate", "get_errors", "run_in_terminal", "get_terminal_output"],
            toolChoice: "auto",
        };
    };
}

export function createToolResultSummarizer(maxLength: number = 1000): PrepareStepHandler {
    return ({ messages }) => {
        const processedMessages = messages.map((msg) => {
            if (
                msg.role === "tool" &&
                typeof msg.content === "string" &&
                msg.content.length > maxLength
            ) {
                const truncated = msg.content.substring(0, maxLength);
                return {
                    ...msg,
                    content: `${truncated}\n\n[Content truncated from ${msg.content.length} to ${maxLength} characters]`,
                };
            }
            return msg;
        });

        return { messages: processedMessages };
    };
}

export function createSequentialWorkflowPreparer(
    workflow: Array<{ step: number; toolName: string }>,
): PrepareStepHandler {
    return ({ stepNumber }) => {
        const currentPhase = workflow.find((w) => w.step === stepNumber);

        if (currentPhase) {
            logger.info(`Forcing tool: ${currentPhase.toolName} at step ${stepNumber}`);
            return {
                toolChoice: { type: "tool", toolName: currentPhase.toolName },
            };
        }

        return {};
    };
}

export function createAdaptiveSystemPrompt(basePrompt: string): PrepareStepHandler {
    return ({ stepNumber, steps }) => {
        const totalErrors = steps.reduce((count, step) => {
            const stepErrors =
                step.toolResults?.filter((result: any) => {
                    if (typeof result.result === "string") {
                        return result.result.includes("error") || result.result.includes("Error");
                    }
                    return false;
                }).length ?? 0;
            return count + stepErrors;
        }, 0);

        if (totalErrors >= 2) {
            logger.info("Adapting system prompt: multiple errors detected");
            return {
                system:
                    basePrompt +
                    "\n\nIMPORTANT: You have encountered multiple errors. Please proceed more carefully, validate your actions, and read files before editing them.",
            };
        }

        if (stepNumber > 10) {
            logger.info("Adapting system prompt: many steps taken");
            return {
                system:
                    basePrompt +
                    "\n\nIMPORTANT: You have taken many steps. Consider summarizing your progress and focusing on completing the main objective.",
            };
        }

        return {};
    };
}

export function createTokenBudgetManager(maxTokensPerStep: number = 2000): PrepareStepHandler {
    return ({ messages }) => {
        const estimatedTokens = messages.reduce((total, msg) => {
            const contentLength =
                typeof msg.content === "string"
                    ? msg.content.length
                    : JSON.stringify(msg.content).length;
            return total + Math.ceil(contentLength / 4);
        }, 0);

        if (estimatedTokens > maxTokensPerStep) {
            logger.info(
                `Token budget management: estimated ${estimatedTokens} tokens, trimming context`,
            );

            const recentMessages = messages.slice(-Math.floor(messages.length / 2));
            return { messages: [messages[0], ...recentMessages] };
        }

        return { messages };
    };
}

export function combinePrepareSteps(
    ...handlers: PrepareStepHandler[]
): (params: Parameters<PrepareStepHandler>[0]) => ReturnType<PrepareStepHandler> {
    return (params) => {
        let currentParams = { ...params };
        let mergedResult: ReturnType<PrepareStepHandler> = {};

        for (const handler of handlers) {
            const result = handler(currentParams);

            if (result.messages) {
                currentParams = { ...currentParams, messages: result.messages };
            }
            if (result.model) {
                currentParams = { ...currentParams, model: result.model };
            }

            mergedResult = { ...mergedResult, ...result };
        }

        return mergedResult;
    };
}
