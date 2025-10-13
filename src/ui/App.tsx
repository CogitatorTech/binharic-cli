import React, { useEffect } from "react";
import { Box, useInput } from "ink";
import { useStore } from "@/agent/state.js";
import { useShallow } from "zustand/react/shallow";
import { History } from "./History.js";
import { UserInput } from "./UserInput.js";
import { Footer } from "./Footer.js";
import { Header } from "./Header.js";
import { HelpMenu } from "./HelpMenu.js";
import { ContextSummaryDisplay } from "./ContextSummaryDisplay.js";
import { ToolConfirmation } from "./ToolConfirmation.js";
import { CheckpointConfirmation } from "./CheckpointConfirmation.js";

export default function App() {
    const { loadInitialConfig, helpMenuOpen, status, clearError } = useStore(
        useShallow((s) => ({
            loadInitialConfig: s.actions.loadInitialConfig,
            helpMenuOpen: s.helpMenuOpen,
            status: s.status,
            clearError: s.actions.clearError,
        })),
    );

    useEffect(() => {
        loadInitialConfig();
    }, [loadInitialConfig]);

    useInput(() => {
        if (status === "error") {
            clearError();
        }
    });

    return (
        <Box flexDirection="column" height="100%">
            <Box paddingX={1}>
                <Header />
            </Box>
            <History />
            <Box flexDirection="column" paddingX={1}>
                {helpMenuOpen && <HelpMenu />}
                <ContextSummaryDisplay />

                {/* Conditionally render UserInput, ToolConfirmation, or CheckpointConfirmation */}
                {status === "checkpoint-request" ? (
                    <CheckpointConfirmation />
                ) : status === "tool-request" ? (
                    <ToolConfirmation />
                ) : (
                    <UserInput />
                )}

                <Footer />
            </Box>
        </Box>
    );
}
