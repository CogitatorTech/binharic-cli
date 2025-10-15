import React from "react";
import { Box } from "ink";
import { useStore } from "@/agent/core/state.js";
import type { HistoryItem } from "@/agent/context/history.js";
import { HistoryItemDisplay } from "./HistoryItemDisplay.js";

export function History() {
    const history = useStore((s) => s.history);

    return (
        <Box flexDirection="column" flexGrow={1} paddingX={1}>
            {history.map((message: HistoryItem) => (
                <Box key={message.id}>
                    <HistoryItemDisplay message={message} />
                </Box>
            ))}
        </Box>
    );
}
