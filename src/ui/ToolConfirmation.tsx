import React from "react";
import { Box, Text, useInput } from "ink";
import { useStore } from "@/agent/core/state.js";
import { useShallow } from "zustand/react/shallow";
import { theme } from "./theme.js";

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
            borderColor={theme.warning}
            paddingX={1}
            marginTop={1}
        >
            <Text bold>
                The Tech-Priest seeks authorization to perform the following sacred rites:
            </Text>
            {pendingToolRequest.calls.map((call) => {
                const args = (call as any).args || (call as any).input || {};
                const argsStr = Object.keys(args).length > 0 ? JSON.stringify(args, null, 0) : "{}";

                return (
                    <Box key={call.toolCallId} flexDirection="column" marginLeft={2}>
                        <Text color={theme.warning}>
                            › {call.toolName}({argsStr})
                        </Text>
                    </Box>
                );
            })}
            <Box marginTop={1}>
                <Text color={theme.dim}>Press ENTER to grant blessing | ESC to deny the ritual</Text>
            </Box>
        </Box>
    );
}
