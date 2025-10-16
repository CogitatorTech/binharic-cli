// src/ui/ContextSummaryDisplay.tsx
import React from "react";
import { Box, Text } from "ink";
import { useStore } from "@/agent/core/state.js";
import { theme } from "./theme.js";

export function ContextSummaryDisplay() {
    const contextFiles = useStore((s) => s.contextFiles);

    const count = contextFiles.length;
    const names = contextFiles.map((p) => p.split("/").pop()).filter(Boolean) as string[];

    return (
        <Box marginBottom={1}>
            <Text color={theme.dim}>
                {count > 0
                    ? `Reading ${count} context file(s): ${names.join(", ")}`
                    : "No context files loaded. Add files with /add or create a BINHARIC.md or AGENT.md file."}
            </Text>
        </Box>
    );
}
