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

// Use a proxy to lazily initialize the logger on first access.
const loggerProxy = new Proxy(
    {},
    {
        get(_, prop) {
            const loggerInstance = getLogger();
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            return loggerInstance[prop];
        },
    },
) as winston.Logger;

export default loggerProxy;
