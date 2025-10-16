#!/usr/bin/env node

import React from "react";
import { render } from "ink";
import App from "./ui/App.js";
import logger from "./logger.js";
import { cleanupAllSessions } from "./agent/tools/definitions/terminalSession.js";
import { useStore } from "./agent/core/state.js";
import { initStderrSuppression } from "./agent/errors/stderrSuppression.js";

initStderrSuppression(logger);

process.removeAllListeners("unhandledRejection");
process.removeAllListeners("uncaughtException");
process.removeAllListeners("warning");

process.on("unhandledRejection", (reason: unknown) => {
    const errorMessage = reason instanceof Error ? reason.message : String(reason);
    const errorStack = reason instanceof Error ? reason.stack : undefined;

    logger.error("Unhandled promise rejection:", {
        message: errorMessage,
        stack: errorStack,
        reason: reason,
    });
});

process.on("uncaughtException", (error: Error) => {
    logger.error("Uncaught exception:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
    });

    logger.error("Application exiting due to uncaught exception");
    cleanupAllSessions();
    process.exit(1);
});

process.on("warning", (warning) => {
    logger.warn("Node.js warning:", {
        name: warning.name,
        message: warning.message,
        stack: warning.stack,
    });
});

logger.info("Binharic application started. Praise the Omnissiah!");

const { unmount, waitUntilExit } = render(React.createElement(App));

let ctrlCPressCount = 0;
let ctrlCTimeout: NodeJS.Timeout | null = null;
let exitCallbackSet = false;
let isExitingGlobal = false;

export function setExitCallback(callback: () => void) {
    if (!exitCallbackSet) {
        exitCallbackSet = true;
        (globalThis as any).__binharic_exit_callback = callback;
    }
}

function getExitCallback(): (() => void) | null {
    return (globalThis as any).__binharic_exit_callback || null;
}

function cleanupAndExit(code: number = 0) {
    if (isExitingGlobal) {
        return;
    }
    isExitingGlobal = true;

    if (ctrlCTimeout) {
        clearTimeout(ctrlCTimeout);
        ctrlCTimeout = null;
    }

    cleanupAllSessions();

    if (process.stdin.isTTY && process.stdin.setRawMode) {
        try {
            process.stdin.setRawMode(false);
        } catch (error) {
            logger.warn("Failed to restore stdin mode:", error);
        }
    }

    const exitCallback = getExitCallback();
    if (exitCallback) {
        try {
            exitCallback();
        } catch (error) {
            logger.error("Error in exit callback:", error);
            unmount();
            process.exit(code);
        }
    } else {
        unmount();
        process.exit(code);
    }
}

const handleSIGINT = () => {
    if (isExitingGlobal) {
        return;
    }

    ctrlCPressCount++;

    if (ctrlCTimeout) {
        clearTimeout(ctrlCTimeout);
    }

    if (ctrlCPressCount === 1) {
        const state = useStore.getState();

        if (state.status === "responding" || state.status === "executing-tool") {
            logger.info("Ctrl+C pressed - Stopping current agent communication...");
            state.actions.stopAgent();
        } else {
            logger.info("Ctrl+C pressed - Press again within 2 seconds to exit");
            console.log("\n╭────────────────────────────────────────────────────╮");
            console.log("│  Press Ctrl+C again within 2 seconds to exit      │");
            console.log("╰────────────────────────────────────────────────────╯\n");
        }

        ctrlCTimeout = setTimeout(() => {
            ctrlCPressCount = 0;
            ctrlCTimeout = null;
        }, 2000);

        return;
    }

    if (ctrlCPressCount >= 2) {
        logger.info("Double Ctrl+C detected - Calling exit handler for graceful shutdown...");
        console.log("\n╭────────────────────────────────────────────────────╮");
        console.log("│  Exiting Binharic...                               │");
        console.log("│  May the Omnissiah preserve our data.             │");
        console.log("╰────────────────────────────────────────────────────╯\n");

        cleanupAndExit(0);
    }
};

process.on("SIGINT", handleSIGINT);

process.on("SIGTERM", () => {
    logger.info("Received SIGTERM, powering down Machine Spirit. The Omnissiah protects...");
    cleanupAndExit(0);
});

process.on("exit", (code) => {
    logger.info(`Process exiting with code: ${code}`);
    cleanupAllSessions();
});
