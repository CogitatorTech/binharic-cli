// src/ui/Header.tsx
import React from "react";
import { Box, Text } from "ink";

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
            <Text color="cyan">{LOGO}</Text>
            <Box flexDirection="column" paddingLeft={1}>
                <Text color="gray" dimColor>
                    Praise the Omnissiah! Tips for communing with the machine spirit:
                </Text>
                <Text dimColor>1. Ask questions, edit files, or run commands.</Text>
                <Text dimColor>2. Be specific for the best results.</Text>
                <Text dimColor>
                    3. Create BINHARIC.md files to customize your interactions with Binharic.
                </Text>
                <Text dimColor>4. /help for more information.</Text>
            </Box>
        </Box>
    );
}
