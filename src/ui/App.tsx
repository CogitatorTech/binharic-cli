import React, { useEffect } from "react";
import { Box, useApp, useInput } from "ink";
import { useStore } from "@/agent/core/state.js";
import { useShallow } from "zustand/react/shallow";
import { History } from "./History.js";
import { UserInput } from "./UserInput.js";
import { Footer } from "./Footer.js";
import { Header } from "./Header.js";
import { HelpMenu } from "./HelpMenu.js";
import { ContextSummaryDisplay } from "./ContextSummaryDisplay.js";
import { ToolConfirmation } from "./ToolConfirmation.js";
import { CheckpointConfirmation } from "./CheckpointConfirmation.js";

declare global {
    // augment global object with optional exit callback holder
    var __binharic_exit_callback: (() => void) | undefined;
}

export default function App() {
    const { exit } = useApp();
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

        const g = globalThis as typeof globalThis & {
            __binharic_exit_callback?: () => void;
        };
        if (typeof g.__binharic_exit_callback === "undefined") {
            g.__binharic_exit_callback = exit;
        }
    }, [loadInitialConfig, exit]);

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
