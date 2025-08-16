// src/ui/ToolConfirmation.tsx
// CORRECTED: Fixed an invalid prop on the Text component.

import React from "react";
import { Box, Text, useInput } from "ink";
import { useStore } from "@/agent/state.js";
import { useShallow } from "zustand/react/shallow";

export function ToolConfirmation() {
    const { pendingToolRequest, confirm, reject } = useStore(
        useShallow((s) => ({
            pendingToolRequest: s.pendingToolRequest,
            confirm: s.actions.confirmToolExecution,
            reject: s.actions.rejectToolExecution,
        })),
    );

    useInput((_, key) => {
        if (key.return) {
            confirm();
        } else if (key.escape) {
            reject();
        }
    });

    if (!pendingToolRequest) return null;

    return (
        <Box
            flexDirection="column"
            borderStyle="round"
            borderColor="yellow"
            paddingX={1}
            marginTop={1}
        >
            <Text bold>Tobi wants to run the following tool(s):</Text>
            {pendingToolRequest.calls.map((call) => (
                <Box key={call.toolCallId} flexDirection="column" marginLeft={2}>
                    <Text color="yellow">
                        › {call.toolName}({JSON.stringify(call.input)})
                    </Text>
                </Box>
            ))}
            {/* CORRECTED: Wrapped Text in a Box to apply margin */}
            <Box marginTop={1}>
                <Text color="gray">Press ENTER to approve, or ESC to reject.</Text>
            </Box>
        </Box>
    );
}
