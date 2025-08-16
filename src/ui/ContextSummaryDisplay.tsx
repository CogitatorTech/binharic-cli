// src/ui/ContextSummaryDisplay.tsx
import React from "react";
import { Box, Text } from "ink";

export function ContextSummaryDisplay() {
    // For now, this is a placeholder.
    // In the future, this will come from the agent's state.
    const tobiMdFileCount = 0;
    const contextFileNames: string[] = [];

    return (
        <Box marginBottom={1}>
            <Text color="gray">
                {tobiMdFileCount > 0
                    ? `Reading ${tobiMdFileCount} context file(s): ${contextFileNames.join(", ")}`
                    : "No context files loaded. Add files with /add or create a TOBI.md or AGENT.md file."}
            </Text>
        </Box>
    );
}
