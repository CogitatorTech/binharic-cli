import winston from "winston";
import path from "path";
import fs from "fs";
import { getConfigDir } from "./paths.js";

let logger: winston.Logger | null = null;

function getLogger(): winston.Logger {
    if (logger) return logger;

    const isTest = process.env.NODE_ENV === "test";
    const isDebugMode =
        process.env.DEBUG_BINHARIC !== undefined || process.env.DEBUG_TOBI !== undefined;
    const logLevel = isTest ? "error" : isDebugMode ? "debug" : "info";

    if (isTest) {
        logger = winston.createLogger({
            level: logLevel,
            format: winston.format.json(),
            transports: [],
            silent: true,
        });
        return logger;
    }

    const overrideLogDir = process.env.BINHARIC_LOG_DIR;
    const LOGS_DIR = overrideLogDir ? overrideLogDir : path.join(getConfigDir(), "logs");
    if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

    logger = winston.createLogger({
        level: logLevel,
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        transports: [
            new winston.transports.File({
                filename: path.join(
                    LOGS_DIR,
                    `binharic-${new Date().toISOString().replace(/[:.]/g, "-")}.log`,
                ),
                maxsize: 1024 * 1024 * 5,
                maxFiles: 5,
                tailable: true,
            }),
        ],
    });

    if (isDebugMode) {
        logger.add(
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple(),
                ),
            }),
        );
    }

    return logger;
}

const loggerProxy = new Proxy({} as winston.Logger, {
    get(_, prop: string) {
        const loggerInstance = getLogger();
        const value = loggerInstance[prop as keyof winston.Logger];
        if (typeof value === "function") return value.bind(loggerInstance);
        return value;
    },
});

export default loggerProxy;
