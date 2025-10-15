import React from "react";
import { Box, Text, useInput } from "ink";
import { useStore } from "@/agent/core/state.js";
import { useShallow } from "zustand/react/shallow";

export function CheckpointConfirmation() {
    const { pendingCheckpoint, confirmCheckpoint, rejectCheckpoint } = useStore(
        useShallow((s) => ({
            pendingCheckpoint: s.pendingCheckpoint,
            confirmCheckpoint: s.actions.confirmCheckpoint,
            rejectCheckpoint: s.actions.rejectCheckpoint,
        })),
    );

    useInput((_, key) => {
        if (key.return) {
            confirmCheckpoint();
        } else if (key.escape) {
            rejectCheckpoint();
        }
    });

    if (!pendingCheckpoint) return null;

    const getRiskColor = (level: string) => {
        switch (level) {
            case "critical":
                return "red";
            case "high":
                return "yellow";
            case "medium":
                return "cyan";
            default:
                return "gray";
        }
    };

    const getRiskLabel = (level: string) => {
        switch (level) {
            case "critical":
                return "CRITICAL";
            case "high":
                return "HIGH RISK";
            case "medium":
                return "MODERATE";
            default:
                return "LOW RISK";
        }
    };

    return (
        <Box
            flexDirection="column"
            borderStyle="round"
            borderColor={getRiskColor(pendingCheckpoint.riskLevel)}
            paddingX={1}
            marginTop={1}
        >
            <Box>
                <Text bold color={getRiskColor(pendingCheckpoint.riskLevel)}>
                    {getRiskLabel(pendingCheckpoint.riskLevel)} - Sacred Checkpoint Required
                </Text>
            </Box>

            <Box marginTop={1} flexDirection="column">
                <Text>
                    <Text bold>Operation:</Text> {pendingCheckpoint.operation}
                </Text>
                {pendingCheckpoint.filePath && (
                    <Text>
                        <Text bold>Target:</Text> {pendingCheckpoint.filePath}
                    </Text>
                )}
                <Text>
                    <Text bold>Description:</Text> {pendingCheckpoint.description}
                </Text>
            </Box>

            {pendingCheckpoint.details && Object.keys(pendingCheckpoint.details).length > 0 && (
                <Box marginTop={1} flexDirection="column">
                    <Text dimColor>Additional Details:</Text>
                    {Object.entries(pendingCheckpoint.details).map(([key, value]) => (
                        <Text key={key} dimColor>
                            {key}: {String(value)}
                        </Text>
                    ))}
                </Box>
            )}

            <Box marginTop={1}>
                <Text color="gray">
                    Press ENTER to grant the Omnissiah's blessing | ESC to deny this operation
                </Text>
            </Box>
        </Box>
    );
}
