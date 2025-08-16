import { encode } from "gpt-tokenizer";
import type { ModelMessage } from "ai";
import type { ModelConfig } from "@/config.js";
import logger from "@/logger.js";

function getTokenCount(text: string): number {
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

export function applyContextWindow(
    history: ModelMessage[],
    modelConfig: ModelConfig,
): ModelMessage[] {
    const { context: contextLimit } = modelConfig;
    const safeContextLimit = contextLimit * 0.8;

    let totalTokens = 0;
    for (const message of history) {
        if (typeof message.content === "string") {
            totalTokens += getTokenCount(message.content);
        } else if (Array.isArray(message.content)) {
            // Handle content arrays (tool results, etc.)
            for (const part of message.content) {
                if ("text" in part && typeof part.text === "string") {
                    totalTokens += getTokenCount(part.text);
                } else if ("value" in part) {
                    // Handle tool-result value field
                    totalTokens += getTokenCount(serializeContent(part.value));
                } else {
                    // Fallback for any other content type
                    totalTokens += getTokenCount(serializeContent(part));
                }
            }
        } else {
            // Handle any other complex content types
            totalTokens += getTokenCount(serializeContent(message.content));
        }
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

    // Always preserve the system prompt (if it's the first message)
    const hasSystemPrompt = trimmedHistory[0]?.role === "system";
    const startIndex = hasSystemPrompt ? 1 : 0;

    while (totalTokens > safeContextLimit && trimmedHistory.length > startIndex + 1) {
        const removedMessage = trimmedHistory.splice(startIndex, 1)[0];
        if (removedMessage) {
            let removedTokens = 0;
            if (typeof removedMessage.content === "string") {
                removedTokens = getTokenCount(removedMessage.content);
            } else if (Array.isArray(removedMessage.content)) {
                for (const part of removedMessage.content) {
                    if ("text" in part && typeof part.text === "string") {
                        removedTokens += getTokenCount(part.text);
                    } else if ("value" in part) {
                        removedTokens += getTokenCount(serializeContent(part.value));
                    } else {
                        removedTokens += getTokenCount(serializeContent(part));
                    }
                }
            } else {
                removedTokens = getTokenCount(serializeContent(removedMessage.content));
            }
            totalTokens -= removedTokens;
            logger.info(
                `Removed message at index ${startIndex} to save ${removedTokens} tokens. New total: ${totalTokens}`,
            );
        }
    }

    logger.info(`History trimmed. Final token count: ${totalTokens}.`);
    return trimmedHistory;
}
