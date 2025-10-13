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
                <Text color="gray">
                    Praise the Omnissiah! Tips for communing with the machine spirit:
                </Text>
                <Text>1. Ask questions, edit files, or run commands.</Text>
                <Text>2. Be specific for the best results.</Text>
                <Text>3. Type /help for more information.</Text>
            </Box>
        </Box>
    );
}
