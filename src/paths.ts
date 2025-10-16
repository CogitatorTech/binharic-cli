import path from "path";
import os from "os";

export function getConfigDir(): string {
    return path.join(os.homedir(), ".config", "binharic");
}

export function getConfigPath(): string {
    return path.join(getConfigDir(), "config.json5");
}

export function getHistoryPath(): string {
    return path.join(getConfigDir(), "history");
}

