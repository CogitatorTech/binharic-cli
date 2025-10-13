import React from "react";
import { Box, Text } from "ink";

interface HighlightedInputProps {
    value: string;
    placeholder?: string;
}

const COMMANDS = [
    "/help",
    "/clear",
    "/clearHistory",
    "/quit",
    "/read_file",
    "/list",
    "/create",
    "/edit",
    "/bash",
    "/fetch",
    "/mcp",
    "/search",
    "/insert_edit_into_file",
    "/run_in_terminal",
    "/get_terminal_output",
    "/get_errors",
    "/grep_search",
    "/validate",
    "/system",
    "/model",
];

export function HighlightedInput({ value, placeholder }: HighlightedInputProps) {
    // Check if input starts with a command
    const startsWithSlash = value.startsWith("/");

    if (!startsWithSlash) {
        return <Text>{value || <Text dimColor>{placeholder}</Text>}</Text>;
    }

    // Find matching command
    const words = value.split(" ");
    const potentialCommand = words[0];
    const matchingCommand = COMMANDS.find((cmd) => potentialCommand === cmd);
    const isPartialMatch =
        !matchingCommand && COMMANDS.some((cmd) => cmd.startsWith(potentialCommand));

    if (matchingCommand) {
        // Full command match - highlight it
        const rest = value.slice(matchingCommand.length);
        return (
            <Text>
                <Text color="cyan" bold>
                    {matchingCommand}
                </Text>
                {rest}
            </Text>
        );
    } else if (isPartialMatch) {
        // Partial match - highlight in yellow
        return (
            <Text>
                <Text color="yellow">{potentialCommand}</Text>
                {value.slice(potentialCommand.length)}
            </Text>
        );
    } else {
        // No match - regular text
        return <Text>{value}</Text>;
    }
}
