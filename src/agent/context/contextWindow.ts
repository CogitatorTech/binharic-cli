import { encode } from "gpt-tokenizer";
import type { ModelMessage } from "ai";
import type { ModelConfig } from "@/config.js";
import logger from "@/logger.js";

function getTokenCount(text: string): number {
    if (text.length >= 12000) return Math.ceil(text.length * 0.4);
    return encode(text).length;
}

function serializeContent(content: unknown): string {
    if (typeof content === "string") return content;
    if (typeof content === "object" && content !== null) {
        try {
            return JSON.stringify(content);
        } catch (err) {
            logger.warn("Failed to serialize content for token counting, using placeholder");
            return "[Complex Object]";
        }
    }
    return String(content);
}

function getMessageTokenCount(message: ModelMessage): number {
    let tokens = 0;

    if (typeof message.content === "string") {
        tokens += getTokenCount(message.content);
    } else if (Array.isArray(message.content)) {
        for (const part of message.content) {
            if ("text" in part && typeof part.text === "string") {
                tokens += getTokenCount(part.text);
            } else if ("output" in part && part.output) {
                if (typeof part.output === "object" && "value" in part.output) {
                    tokens += getTokenCount(serializeContent((part.output as any).value));
                } else {
                    tokens += getTokenCount(serializeContent((part as any).output));
                }
            } else if ("toolName" in part && typeof (part as any).toolName === "string") {
                tokens += getTokenCount((part as any).toolName as string);
                tokens += 10;
                if ("args" in part && (part as any).args) {
                    tokens += getTokenCount(serializeContent((part as any).args));
                }
            } else {
                tokens += getTokenCount(serializeContent(part as any));
            }
        }
    } else {
        tokens += getTokenCount(serializeContent(message.content as any));
    }

    tokens += 4;

    if (message.role === "tool") {
        tokens += 15;
    }

    return tokens;
}

export function applyContextWindow(
    history: ModelMessage[],
    modelConfig: ModelConfig,
): ModelMessage[] {
    const { context: contextLimit } = modelConfig;
    const safeContextLimit = contextLimit * 0.8;

    let totalTokens = 0;
    for (const message of history) {
        totalTokens += getMessageTokenCount(message);
    }

    if (totalTokens <= safeContextLimit) {
        logger.info(
            `Token count (${totalTokens}) is within the safe limit of ${safeContextLimit}. No trimming needed.`,
        );
        return history;
    }

    logger.warn(
        `Token count (${totalTokens}) exceeds the safe limit of ${safeContextLimit}. Trimming history...`,
    );

    const trimmedHistory = [...history];

    const hasSystemPrompt = trimmedHistory[0]?.role === "system";
    const startIndex = hasSystemPrompt ? 1 : 0;

    while (totalTokens > safeContextLimit && trimmedHistory.length > startIndex + 1) {
        const removedMessage = trimmedHistory.splice(startIndex, 1)[0];
        if (removedMessage) {
            const removedTokens = getMessageTokenCount(removedMessage);
            totalTokens -= removedTokens;
            logger.info(
                `Removed message at index ${startIndex} to save ${removedTokens} tokens. New total: ${totalTokens}`,
            );
        }
    }

    logger.info(`History trimmed. Final token count: ${totalTokens}.`);
    return trimmedHistory;
}
