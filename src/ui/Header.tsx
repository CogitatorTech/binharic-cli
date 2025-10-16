// src/ui/Header.tsx
import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

const LOGO = `
██████╗ ██╗███╗   ██╗██╗  ██╗ █████╗ ██████╗ ██╗ ██████╗
██╔══██╗██║████╗  ██║██║  ██║██╔══██╗██╔══██╗██║██╔════╝
██████╔╝██║██╔██╗ ██║███████║███████║██████╔╝██║██║
██╔══██╗██║██║╚██╗██║██╔══██║██╔══██║██╔══██╗██║██║
██████╔╝██║██║ ╚████║██║  ██║██║  ██║██║  ██║██║╚██████╗
╚═════╝ ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝ ╚═════╝
`;

export function Header() {
    return (
        <Box flexDirection="column" marginBottom={1}>
            <Text color={theme.primary}>{LOGO}</Text>
            <Box flexDirection="column" paddingLeft={1}>
                <Text color={theme.dim} dimColor>
                    Praise the Omnissiah! Tips for communing with the machine spirit:
                </Text>
                <Text dimColor>1. Ask questions, edit files, or run commands.</Text>
                <Text dimColor>2. Be specific for the best results.</Text>
                <Text dimColor>
                    3. Create a BINHARIC.md file to customize your interactions with Binharic.
                </Text>
                <Text dimColor>4. /help for more information.</Text>
            </Box>
        </Box>
    );
}
