// src/ui/History.tsx
import { Box } from "ink";
import React from "react";
import { useStore } from "@/agent/state.js";
import { HistoryItemDisplay } from "./HistoryItemDisplay.js";
import type { HistoryItem } from "@/agent/history.js";

export function History() {
    const history = useStore((s) => s.history);

    return (
        <Box flexDirection="column" flexGrow={1} paddingX={1}>
            {history.map((message: HistoryItem) => (
                <Box key={message.id} marginBottom={1}>
                    <HistoryItemDisplay message={message} />
                </Box>
            ))}
        </Box>
    );
}
