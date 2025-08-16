// src/ui/HistoryItemDisplay.tsx
// REFACTORED: This component is now much more powerful. It renders the different
// types from our new rich `HistoryItem` structure.

import React from "react";
import { Box, Text } from "ink";
import { marked, type Token } from "marked";
import type { AssistantContent } from "ai";
import type { HistoryItem } from "@/agent/history.js";

function MarkdownRenderer({ content }: { content: string }) {
    // This component remains the same as your original, it's good.
    const tokens = marked.lexer(content);
    const renderTokens = (tokens: Token[] | undefined): React.ReactNode => {
        if (!tokens) return null;
        return tokens.map((token, index) => {
            switch (token.type) {
                case "heading":
                    return (
                        <Text key={index} bold>
                            {"tokens" in token && renderTokens(token.tokens)}
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
                                    {"tokens" in item && renderTokens(item.tokens)}
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
                            <Text>{"tokens" in token && renderTokens(token.tokens)}</Text>
                        </Box>
                    );
                case "strong":
                    return (
                        <Text key={index} bold>
                            {"tokens" in token && renderTokens(token.tokens)}
                        </Text>
                    );
                case "em":
                    return (
                        <Text key={index} italic>
                            {"tokens" in token && renderTokens(token.tokens)}
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

// Renders content from an assistant, which might be text or structured tool calls.
function AssistantMessageContent({ content }: { content: AssistantContent | string }) {
    if (typeof content === "string") {
        return <MarkdownRenderer content={`Tobi: ${content}`} />;
    }
    const textPart = content.find((part) => part.type === "text");
    return (
        <Box flexDirection="column">
            {textPart && <MarkdownRenderer content={`Tobi: ${textPart.text}`} />}
        </Box>
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
            return (
                <Box borderStyle="round" borderColor="yellow" paddingX={1} flexDirection="column">
                    <Text color="yellow" bold>
                        Proposed Tool Call(s):
                    </Text>
                    {message.calls.map((call) => (
                        <Text key={call.toolCallId} color="yellow" dimColor>
                            › {call.toolName}({JSON.stringify(call.input)})
                        </Text>
                    ))}
                </Box>
            );

        case "tool-result": {
            const resultString =
                typeof message.output === "string"
                    ? message.output
                    : JSON.stringify(message.output, null, 2);

            return (
                <Box borderStyle="round" borderColor="cyan" paddingX={1} flexDirection="column">
                    <Text color="cyan" bold>
                        › Tool Result ({message.toolName}):
                    </Text>
                    <Text color="cyan" dimColor>
                        {resultString}
                    </Text>
                </Box>
            );
        }

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
