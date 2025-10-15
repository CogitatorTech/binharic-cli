// src/ui/Footer.tsx
// REFACTORED: Added new status texts for the more granular state machine.

import React from "react";
import { Box, Text } from "ink";
import { useStore } from "@/agent/core/state.js";
import { getConfigDir } from "@/config.js";
import path from "path";
import { useShallow } from "zustand/react/shallow";
import Spinner from "ink-spinner";
import { encode } from "gpt-tokenizer";

const statusTexts: { [key: string]: string } = {
    initializing: "Awakening the machine spirit...",
    responding: "Communing with the Omnissiah...",
    "tool-request": "Seeking the Tech-Priest's blessing...",
    "executing-tool": "Performing sacred rites...",
};

function calculateContextUsage(config: any, history: any[]): number {
    if (!config?.models) return 0;
    const modelConfig = config.models.find((m: any) => m.name === config.defaultModel);
    if (!modelConfig) return 0;

    const contextLimit = modelConfig.context || 128000;
    let totalTokens = 0;

    for (const item of history) {
        if (typeof item.content === "string") {
            totalTokens += encode(item.content).length;
        } else if (item.content) {
            totalTokens += encode(JSON.stringify(item.content)).length;
        }
    }

    return Math.min(100, Math.round((totalTokens / contextLimit) * 100));
}

export function Footer() {
    const { status, error, config, branchName } = useStore(
        useShallow((s) => ({
            status: s.status,
            error: s.error,
            config: s.config,
            branchName: s.branchName,
        })),
    );

    const cwd = path.basename(process.cwd());
    const modelName = config?.defaultModel ?? "loading...";
    const statusText = statusTexts[status];
    const logsDir = path.join(getConfigDir(), "logs");
    const isAgentBusy = status === "responding" || status === "executing-tool";

    return (
        <Box flexDirection="column" marginTop={1}>
            {status !== "idle" && status !== "error" && (
                <Box marginBottom={1} justifyContent="center">
                    <Spinner type="dots" />
                    {statusText && <Text> {statusText}</Text>}
                </Box>
            )}

            {isAgentBusy && (
                <Box marginBottom={1} justifyContent="center">
                    <Text color="yellow">Press ESC to cancel</Text>
                </Box>
            )}

            {status === "error" && (
                <Box flexDirection="column" alignItems="center" marginBottom={1}>
                    <Text color="red">⚠️ Corruption detected in the machine spirit: {error}</Text>
                    <Text color="yellow">Consult the sacred logs: {logsDir}</Text>
                    <Text>Press any key to recalibrate and continue.</Text>
                </Box>
            )}

            <Box justifyContent="space-between">
                <Box>
                    <Text color="gray">{cwd}</Text>
                    <Text color="gray"> ({branchName})</Text>
                </Box>

                <Box>
                    <Text color="blue">{modelName}</Text>
                </Box>
            </Box>
        </Box>
    );
}
