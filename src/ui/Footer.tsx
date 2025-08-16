// src/ui/Footer.tsx
// REFACTORED: Added new status texts for the more granular state machine.

import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useStore } from "@/agent/state.js";
import path from "path";
import { useShallow } from "zustand/react/shallow";

const statusTexts: { [key: string]: string } = {
    initializing: "initializing...",
    responding: "responding...",
    "tool-request": "awaiting confirmation...",
    "executing-tool": "executing tool...",
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

    return (
        <Box marginTop={1} justifyContent="space-between">
            <Box>
                <Text color="gray">{cwd}</Text>
                <Text color="gray"> ( {branchName})</Text>
            </Box>

            {status !== "idle" && status !== "error" && (
                <Box>
                    <Spinner type="dots" />
                    {statusText && <Text> {statusText}</Text>}
                </Box>
            )}

            {status === "error" && (
                <Box flexDirection="column" alignItems="center">
                    <Text color="red">Error: {error}</Text>
                    <Text>Press any key to continue.</Text>
                </Box>
            )}

            {status !== "error" && <Text color="blue">{modelName}</Text>}
        </Box>
    );
}
