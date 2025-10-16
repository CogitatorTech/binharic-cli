import React from "react";
import { Box, Text } from "ink";
import type { HistoryItem } from "@/agent/context/history.js";
import type { AssistantContent } from "ai";
import { theme } from "./theme.js";

function extractText(content: AssistantContent | string): string {
    if (typeof content === "string") return content;
    // Concatenate text parts if present
    const parts = Array.isArray(content) ? content : [content];
    const texts: string[] = [];
    for (const part of parts as any[]) {
        if (part && part.type === "text" && typeof part.text === "string") {
            texts.push(part.text);
        }
    }
    return texts.join("") || "";
}

type Segment = { type: "text"; value: string } | { type: "code"; lang?: string; value: string };

function parseRichSegments(text: string): Segment[] {
    const segments: Segment[] = [];
    if (!text) return segments;

    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
        }
        segments.push({ type: "code", lang: match[1] || undefined, value: match[2] });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
        segments.push({ type: "text", value: text.slice(lastIndex) });
    }
    return segments;
}

function renderInlineCode(text: string) {
    // Split by inline code `code`
    const parts: Array<string | { code: string }> = [];
    const regex = /`([^`]+)`/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
        if (m.index > last) parts.push(text.slice(last, m.index));
        parts.push({ code: m[1] });
        last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));

    return (
        <>
            {parts.map((p, i) =>
                typeof p === "string" ? (
                    <Text key={i}>{p}</Text>
                ) : (
                    <Text key={i} color={theme.codeInline}>{p.code}</Text>
                ),
            )}
        </>
    );
}

function AssistantMessageContent({ content }: { content: AssistantContent | string }) {
    const plain = extractText(content);
    const segments = parseRichSegments(plain);

    if (segments.length === 0) return <Text>{plain}</Text>;

    return (
        <Box flexDirection="column">
            {segments.map((seg, idx) =>
                seg.type === "text" ? (
                    <Text key={idx}>{renderInlineCode(seg.value)}</Text>
                ) : (
                    <Box key={idx} flexDirection="column" borderStyle="classic" borderColor={theme.codeBlockBorder} paddingX={1}>
                        {seg.lang && (
                            <Text color={theme.dim}>{seg.lang}</Text>
                        )}
                        <Text>
                            {seg.value}
                        </Text>
                    </Box>
                ),
            )}
        </Box>
    );
}

export function HistoryItemDisplay({ message }: { message: HistoryItem }) {
    switch (message.role) {
        case "user":
            return <Text color={theme.userPrompt}>&gt; {message.content}</Text>;
        case "assistant":
            return (
                <Box borderStyle="round" borderColor={theme.assistantBorder} paddingX={1} flexDirection="column">
                    <AssistantMessageContent content={message.content} />
                </Box>
            );
        case "tool-request":
            return null;
        case "tool-result":
            return null;
        case "tool-failure":
            return (
                <Box borderStyle="round" borderColor={theme.error} paddingX={1} flexDirection="column">
                    <Text color={theme.error} bold>
                        › Tool Failure ({message.toolName}):
                    </Text>
                    <Text color={theme.error}>{message.error}</Text>
                </Box>
            );
        default:
            return null;
    }
}
