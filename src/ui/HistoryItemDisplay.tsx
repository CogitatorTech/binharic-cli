import React from "react";
import { Box, Text } from "ink";
import type { HistoryItem } from "@/agent/context/history.js";
import type { AssistantContent } from "ai";

function AssistantMessageContent({ content }: { content: AssistantContent | string }) {
    if (typeof content === "string") {
        return <Text>{content}</Text>;
    }
    const textPart = content.find((part: any) => part.type === "text") as any;
    return <Box flexDirection="column">{textPart && <Text>{textPart.text}</Text>}</Box>;
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
