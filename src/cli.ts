#!/usr/bin/env node

import React from "react";
import { render } from "ink";
import App from "./ui/App.js";
import logger from "./logger.js";
import { cleanupAllSessions } from "./agent/tools/definitions/terminalSession.js";
import { useStore } from "./agent/state.js";

const originalStderrWrite = process.stderr.write.bind(process.stderr);

process.stderr.write = function (chunk: unknown, encoding?: unknown, callback?: unknown): boolean {
    const chunkStr = chunk?.toString() || "";

    const shouldSuppress =
        chunkStr.includes("APICallError") ||
        chunkStr.includes("AI_APICallError") ||
        chunkStr.includes("at file://") ||
        chunkStr.includes("at async") ||
        chunkStr.includes("at process.processTicksAndRejections") ||
        (chunkStr.includes("{") && chunkStr.includes("statusCode")) ||
        chunkStr.includes("requestBodyValues") ||
        chunkStr.includes("responseHeaders") ||
        chunkStr.includes("responseBody") ||
        chunkStr.includes("[Symbol(vercel.ai.error)]");

    if (shouldSuppress) {
        logger.error("Suppressed stderr output:", { message: chunkStr.trim() });
        if (typeof callback === "function") {
            callback();
        }
        return true;
    }

    return originalStderrWrite(
        chunk as string,
        encoding as BufferEncoding,
        callback as (error?: Error | null) => void,
    );
} as typeof process.stderr.write;

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

const { unmount } = render(React.createElement(App));

let ctrlCPressCount = 0;
let ctrlCTimeout: NodeJS.Timeout | null = null;

process.on("SIGINT", () => {
    ctrlCPressCount++;

    if (ctrlCTimeout) {
        clearTimeout(ctrlCTimeout);
    }

    if (ctrlCPressCount === 1) {
        const state = useStore.getState();

        if (state.status === "responding" || state.status === "executing-tool") {
            logger.info("Ctrl+C pressed - Stopping current agent communication...");
            state.actions.stopAgent();
            console.log(
                "\nWarning: Agent communication stopped. Press Ctrl+C again within 2 seconds to exit.\n",
            );
        } else {
            logger.info("Ctrl+C pressed - Press again within 2 seconds to exit");
            console.log("\nWarning: Press Ctrl+C again within 2 seconds to exit.\n");
        }

        ctrlCTimeout = setTimeout(() => {
            ctrlCPressCount = 0;
            ctrlCTimeout = null;
        }, 2000);
    } else if (ctrlCPressCount >= 2) {
        logger.info("Double Ctrl+C detected - Exiting application...");
        console.log("\nExiting Binharic. May the Omnissiah preserve our data.\n");
        cleanupAllSessions();
        unmount();
        process.exit(0);
    }
});

process.on("SIGTERM", () => {
    logger.info("Received SIGTERM, powering down machine spirit. The Omnissiah protects...");
    cleanupAllSessions();
    unmount();
    process.exit(0);
});
