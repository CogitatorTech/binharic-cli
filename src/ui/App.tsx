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
import ExitSummary from "./ExitSummary.js";

declare global {
    // augment global object with optional exit callback holder
    var __binharic_exit_callback: (() => void) | undefined;
}

export default function App() {
    const { exit } = useApp();
    const { loadInitialConfig, helpMenuOpen, status, clearError, showExitSummary, beginExit } =
        useStore(
            useShallow((s) => ({
                loadInitialConfig: s.actions.loadInitialConfig,
                helpMenuOpen: s.helpMenuOpen,
                status: s.status,
                clearError: s.actions.clearError,
                showExitSummary: s.showExitSummary,
                beginExit: s.actions.beginExit,
            })),
        );

    useEffect(() => {
        loadInitialConfig();

        const g = globalThis as typeof globalThis & {
            __binharic_exit_callback?: () => void;
        };
        // Install a custom exit callback that shows summary before exiting
        g.__binharic_exit_callback = () => {
            beginExit();
            // Give Ink time to render the summary, then exit the app and process
            setTimeout(() => {
                exit();
                // extra safety: force process exit shortly after unmount
                setTimeout(() => process.exit(0), 100);
            }, 600);
        };
    }, [loadInitialConfig, exit, beginExit]);

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
            {!showExitSummary && <History />}
            <Box flexDirection="column" paddingX={1}>
                {helpMenuOpen && <HelpMenu />}
                {!showExitSummary && <ContextSummaryDisplay />}
                {showExitSummary ? (
                    <ExitSummary />
                ) : status === "checkpoint-request" ? (
                    <CheckpointConfirmation />
                ) : status === "tool-request" ? (
                    <ToolConfirmation />
                ) : (
                    <UserInput />
                )}
                {!showExitSummary && <Footer />}
            </Box>
        </Box>
    );
}
