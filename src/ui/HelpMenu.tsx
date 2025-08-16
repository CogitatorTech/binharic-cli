import React from "react";
import { Box, Text } from "ink";
import { toolModules } from "../agent/tools/definitions/index.js";

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

const dynamicCommands = Object.entries(toolModules).map(([name, module]) => ({
    command: `/${name}`,
    description: module.description,
}));

const allCommands = [...staticCommands, ...dynamicCommands];

export function HelpMenu() {
    return (
        <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1}>
            <Text bold>Help Menu</Text>
            {allCommands.map((cmd) => (
                <Box key={cmd.command}>
                    <Text>
                        {cmd.command}: {cmd.description}
                    </Text>
                </Box>
            ))}
        </Box>
    );
}
