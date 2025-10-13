import winston from "winston";
import path from "path";

import { getConfigDir } from "./config.js";

let logger: winston.Logger | null = null;

function getLogger(): winston.Logger {
    if (logger) {
        return logger;
    }

    const LOGS_DIR = path.join(getConfigDir(), "logs");

    const isLoggingEnabled = process.env.DEBUG_TOBI !== undefined;

    if (isLoggingEnabled) {
        logger = winston.createLogger({
            level: "debug",
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
            transports: [
                new winston.transports.File({
                    filename: path.join(LOGS_DIR, `tobi-${new Date().toISOString()}.log`),
                    maxsize: 1024 * 1024 * 5, // 5MB
                    maxFiles: 5,
                    tailable: true,
                    zippedArchive: true,
                }),
            ],
        });
    } else {
        logger = winston.createLogger({
            transports: [new winston.transports.Console()],
            silent: true,
        });
    }

    return logger;
}

const loggerProxy = new Proxy({} as winston.Logger, {
    get(_, prop: string) {
        const loggerInstance = getLogger();
        const value = loggerInstance[prop as keyof winston.Logger];
        if (typeof value === "function") {
            return value.bind(loggerInstance);
        }
        return value;
    },
});

export default loggerProxy;
