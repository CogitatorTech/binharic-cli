import React from "react";
import { Box, Text } from "ink";
import { marked, type Token } from "marked";
import type { AssistantContent } from "ai";
import type { HistoryItem } from "@/agent/history.js";

function extractTextFromTokens(tokens: Token[] | undefined): string {
    if (!tokens) return "";
    return tokens
        .map((token) => {
            if ("text" in token && typeof token.text === "string") {
                return token.text;
            }
            if ("tokens" in token) {
                return extractTextFromTokens(token.tokens as Token[]);
            }
            if ("raw" in token) {
                return token.raw;
            }
            return "";
        })
        .join("");
}

function MarkdownRenderer({ content }: { content: string }) {
    const tokens = marked.lexer(content);
    const renderTokens = (tokens: Token[] | undefined): React.ReactNode => {
        if (!tokens) return null;
        return tokens.map((token, index) => {
            switch (token.type) {
                case "heading":
                    return (
                        <Text key={index} bold>
                            {extractTextFromTokens(
                                "tokens" in token ? (token.tokens as Token[]) : undefined,
                            )}
                        </Text>
                    );
                case "paragraph":
                    return (
                        <Box key={index} flexDirection="row" flexWrap="wrap">
                            {"tokens" in token && renderTokens(token.tokens)}
                        </Box>
                    );
                case "list":
                    return (
                        <Box key={index} flexDirection="column">
                            {token.items.map((item: Token, itemIndex: number) => (
                                <Text key={itemIndex}>
                                    {token.ordered ? `${itemIndex + 1}.` : "-"}{" "}
                                    {extractTextFromTokens(
                                        "tokens" in item ? (item.tokens as Token[]) : undefined,
                                    )}
                                </Text>
                            ))}
                        </Box>
                    );
                case "code":
                    return (
                        <Box key={index} borderStyle="round" paddingX={1}>
                            <Text>{token.text}</Text>
                        </Box>
                    );
                case "blockquote":
                    return (
                        <Box key={index} borderStyle="single" paddingX={1} borderColor="gray">
                            <Text>
                                {extractTextFromTokens(
                                    "tokens" in token ? (token.tokens as Token[]) : undefined,
                                )}
                            </Text>
                        </Box>
                    );
                case "strong":
                    return (
                        <Text key={index} bold>
                            {extractTextFromTokens(
                                "tokens" in token ? (token.tokens as Token[]) : undefined,
                            )}
                        </Text>
                    );
                case "em":
                    return (
                        <Text key={index} italic>
                            {extractTextFromTokens(
                                "tokens" in token ? (token.tokens as Token[]) : undefined,
                            )}
                        </Text>
                    );
                case "text":
                    return <Text key={index}>{token.text}</Text>;
                case "space":
                    return <Text key={index}> </Text>;
                default:
                    return <Text key={index}>{token.raw}</Text>;
            }
        });
    };
    return <Box flexDirection="column">{renderTokens(tokens)}</Box>;
}

function AssistantMessageContent({ content }: { content: AssistantContent | string }) {
    if (typeof content === "string") {
        return <MarkdownRenderer content={content} />;
    }
    const textPart = content.find((part) => part.type === "text");
    return (
        <Box flexDirection="column">{textPart && <MarkdownRenderer content={textPart.text} />}</Box>
    );
}

export function HistoryItemDisplay({ message }: { message: HistoryItem }) {
    switch (message.role) {
        case "user":
            return <Text color="white">&gt; {message.content}</Text>;
        case "assistant":
            return (
                <Box borderStyle="round" borderColor="green" paddingX={1}>
                    <AssistantMessageContent content={message.content} />
                </Box>
            );
        case "tool-request":
            return null;
        case "tool-result":
            return null;
        case "tool-failure":
            return (
                <Box borderStyle="round" borderColor="red" paddingX={1} flexDirection="column">
                    <Text color="red" bold>
                        › Tool Failure ({message.toolName}):
                    </Text>
                    <Text color="red">{message.error}</Text>
                </Box>
            );
        default:
            return null;
    }
}
