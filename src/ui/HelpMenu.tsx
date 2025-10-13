import React from "react";
import { Box, Text } from "ink";
import { tools } from "../agent/tools/definitions/index.js";

const staticCommands = [
    {
        command: "/help",
        description: "Show this help message",
    },
    {
        command: "/clear",
        description: "Clear the conversation output",
    },
    {
        command: "/clearHistory",
        description: "Clear the command history",
    },
    {
        command: "/quit",
        description: "Exit the application",
    },
];

const dynamicCommands = Object.entries(tools).map(([name, tool]) => ({
    command: `/${name}`,
    description: tool.description || `Execute ${name} tool`,
}));

const allCommands = [...staticCommands, ...dynamicCommands];

export function HelpMenu() {
    return (
        <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1}>
            <Text bold color="yellow">
                Help Menu
            </Text>
            {allCommands.map((cmd) => (
                <Box key={cmd.command}>
                    <Text>
                        <Text color="cyan" bold>
                            {cmd.command}
                        </Text>
                        <Text>: {cmd.description}</Text>
                    </Text>
                </Box>
            ))}
        </Box>
    );
}
