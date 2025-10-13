// src/ui/Footer.tsx
// REFACTORED: Added new status texts for the more granular state machine.

import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useStore } from "@/agent/state.js";
import { getConfigDir } from "@/config.js";
import path from "path";
import { useShallow } from "zustand/react/shallow";

const statusTexts: { [key: string]: string } = {
    initializing: "Awakening the machine spirit...",
    responding: "Communing with the Omnissiah...",
    "tool-request": "Seeking the Tech-Priest's blessing...",
    "executing-tool": "Performing sacred rites...",
};

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

    return (
        <Box marginTop={1} justifyContent="space-between">
            <Box>
                <Text color="gray">{cwd}</Text>
                <Text color="gray"> ( {branchName})</Text>
            </Box>

            {status !== "idle" && status !== "error" && (
                <Box>
                    <Spinner type="dots" />
                    {statusText && <Text> {statusText}</Text>}
                </Box>
            )}

            {status === "error" && (
                <Box flexDirection="column" alignItems="center">
                    <Text color="red">⚠️ Corruption detected in the machine spirit: {error}</Text>
                    <Text color="yellow">Consult the sacred logs: {logsDir}</Text>
                    <Text>Press any key to recalibrate and continue.</Text>
                </Box>
            )}

            {status !== "error" && <Text color="blue">{modelName}</Text>}
        </Box>
    );
}
