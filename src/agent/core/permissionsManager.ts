import fs from "fs/promises";
import path from "path";
import os from "os";
import logger from "@/logger.js";

export interface PermissionRule {
    pattern: string;
    allow: boolean;
    scope?: "session" | "project" | "global";
}

export interface PermissionsConfig {
    allowedCommands: string[];
    blockedCommands: string[];
    allowedPaths: string[];
    blockedPaths: string[];
    rules: PermissionRule[];
    autoApprove?: {
        readOperations?: boolean;
        safeCommands?: boolean;
    };
}

const SAFE_READ_COMMANDS = [
    "ls",
    "cat",
    "pwd",
    "echo",
    "which",
    "env",
    "git status",
    "git log",
    "git diff",
    "npm list",
];

const DANGEROUS_COMMANDS = [
    "rm -rf",
    "dd",
    "mkfs",
    "format",
    "> /dev/",
    "chmod -R 777",
    "chown -R",
];

export class PermissionsManager {
    private config: PermissionsConfig;
    private sessionAllowed: Set<string> = new Set();
    private configPath: string;

    constructor(projectRoot?: string) {
        this.config = {
            allowedCommands: [],
            blockedCommands: [],
            allowedPaths: [],
            blockedPaths: [],
            rules: [],
            autoApprove: {
                readOperations: false,
                safeCommands: false,
            },
        };

        this.configPath = projectRoot
            ? path.join(projectRoot, ".binharic", "permissions.json")
            : path.join(os.homedir(), ".config", "binharic", "permissions.json");
    }

    async load(): Promise<void> {
        try {
            const content = await fs.readFile(this.configPath, "utf-8");
            this.config = JSON.parse(content);
            logger.info(`Loaded permissions from ${this.configPath}`);
        } catch (error) {
            logger.debug("No permissions file found, using defaults");
        }
    }

    async save(): Promise<void> {
        try {
            await fs.mkdir(path.dirname(this.configPath), { recursive: true });
            await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
            logger.info(`Saved permissions to ${this.configPath}`);
        } catch (error) {
            logger.error("Failed to save permissions", error);
        }
    }

    checkCommand(command: string): "allow" | "deny" | "prompt" {
        if (this.sessionAllowed.has(command)) {
            return "allow";
        }

        if (DANGEROUS_COMMANDS.some((dangerous) => command.includes(dangerous))) {
            return "prompt";
        }

        if (
            this.config.autoApprove?.safeCommands &&
            SAFE_READ_COMMANDS.some((safe) => command.startsWith(safe))
        ) {
            return "allow";
        }

        if (this.config.allowedCommands.some((pattern) => this.matchesPattern(command, pattern))) {
            return "allow";
        }

        if (this.config.blockedCommands.some((pattern) => this.matchesPattern(command, pattern))) {
            return "deny";
        }

        for (const rule of this.config.rules) {
            if (this.matchesPattern(command, rule.pattern)) {
                return rule.allow ? "allow" : "deny";
            }
        }

        return "prompt";
    }

    checkPath(filePath: string, operation: "read" | "write" | "delete"): "allow" | "deny" | "prompt" {
        const normalizedPath = path.normalize(filePath);

        if (operation === "read" && this.config.autoApprove?.readOperations) {
            return "allow";
        }

        if (this.config.allowedPaths.some((allowed) => normalizedPath.startsWith(allowed))) {
            return "allow";
        }

        if (this.config.blockedPaths.some((blocked) => normalizedPath.startsWith(blocked))) {
            return "deny";
        }

        const sensitivePatterns = ["/etc/", "/var/", "/sys/", "/proc/", ".ssh/", ".env"];
        if (operation === "write" || operation === "delete") {
            if (sensitivePatterns.some((pattern) => normalizedPath.includes(pattern))) {
                return "prompt";
            }
        }

        return "prompt";
    }

    allowForSession(command: string): void {
        this.sessionAllowed.add(command);
    }

    async allowPermanently(command: string, scope: "project" | "global" = "project"): Promise<void> {
        this.config.allowedCommands.push(command);
        await this.save();
    }

    private matchesPattern(value: string, pattern: string): boolean {
        const regex = new RegExp(pattern.replace(/\*/g, ".*"));
        return regex.test(value);
    }
}

