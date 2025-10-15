import fs from "fs/promises";
import path from "path";
import logger from "@/logger.js";
import { FileExistsError, FileOutdatedError, ToolError } from "../errors/index.js";

export { FileExistsError, FileOutdatedError };

export class FileTracker {
    private static readonly MAX_TRACKED_FILES = 1000;
    private readTimestamps = new Map<string, number>();

    async read(filePath: string): Promise<string> {
        const absolutePath = path.resolve(filePath);

        await this.validateFilePath(absolutePath);

        const content = await fs.readFile(absolutePath, "utf8");
        const modified = await this.getModifiedTime(absolutePath);

        this.enforceLimit();

        if (this.readTimestamps.has(absolutePath)) this.readTimestamps.delete(absolutePath);
        this.readTimestamps.set(absolutePath, modified);
        logger.debug(`File read tracked: ${absolutePath} at ${modified}`);
        return content;
    }

    async write(filePath: string, content: string): Promise<void> {
        const absolutePath = path.resolve(filePath);

        await this.validateFilePath(absolutePath, true);

        const dir = path.dirname(absolutePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(absolutePath, content, "utf8");
        const modified = await this.getModifiedTime(absolutePath);

        this.enforceLimit();

        if (this.readTimestamps.has(absolutePath)) this.readTimestamps.delete(absolutePath);
        this.readTimestamps.set(absolutePath, modified);
        logger.debug(`File write tracked: ${absolutePath} at ${modified}`);
    }

    async assertCanCreate(filePath: string): Promise<void> {
        const absolutePath = path.resolve(filePath);
        try {
            await fs.access(absolutePath);
            throw new FileExistsError(
                `File already exists at ${absolutePath}. Use the 'edit' tool to modify it.`,
            );
        } catch (error) {
            if (error instanceof FileExistsError) throw error;
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
    }

    async assertCanEdit(filePath: string): Promise<void> {
        const absolutePath = path.resolve(filePath);

        if (!this.readTimestamps.has(absolutePath)) {
            try {
                await fs.access(absolutePath);
                const modified = await this.getModifiedTime(absolutePath);
                this.enforceLimit();
                this.readTimestamps.set(absolutePath, modified);
                logger.debug(`File automatically tracked for edit: ${absolutePath} at ${modified}`);
                return;
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                    throw new FileOutdatedError(
                        `File not found: ${absolutePath}. Use the 'create' tool first.`,
                    );
                }
                throw error;
            }
        }

        const lastReadTime = this.readTimestamps.get(absolutePath)!;
        let currentModifiedTime;
        try {
            currentModifiedTime = await this.getModifiedTime(absolutePath);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                throw new FileOutdatedError(
                    `File seems to have been deleted after it was last read: ${absolutePath}`,
                );
            }
            throw error;
        }

        if (currentModifiedTime > lastReadTime) {
            this.readTimestamps.delete(absolutePath);
            throw new FileOutdatedError(
                `File was modified since it was last read. Please read the file again to get the latest version: ${absolutePath}`,
            );
        }
    }

    clearTracking(): void {
        this.readTimestamps.clear();
        logger.debug("File tracking cleared");
    }

    getTrackedFiles(): string[] {
        return Array.from(this.readTimestamps.keys());
    }

    getTrackedFileCount(): number {
        return this.readTimestamps.size;
    }

    isTracked(filePath: string): boolean {
        const absolutePath = path.resolve(filePath);
        return this.readTimestamps.has(absolutePath);
    }

    private async validateFilePath(filePath: string, allowNew: boolean = false): Promise<void> {
        try {
            const stat = await fs.lstat(filePath);

            if (stat.isSymbolicLink()) {
                logger.warn(`Attempting to access symbolic link: ${filePath}`);
                const realPath = await fs.realpath(filePath);
                logger.info(`Symbolic link resolves to: ${realPath}`);
            }

            if (stat.isDirectory()) {
                throw new ToolError(`Path is a directory, not a file: ${filePath}`);
            }

            if (!stat.isFile() && !stat.isSymbolicLink()) {
                throw new ToolError(`Path is not a regular file: ${filePath}`);
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                if (!allowNew) {
                    throw error;
                }
            } else if (error instanceof ToolError) {
                throw error;
            } else {
                throw error;
            }
        }
    }

    private enforceLimit(): void {
        while (this.readTimestamps.size >= FileTracker.MAX_TRACKED_FILES) {
            const oldestKey = this.readTimestamps.keys().next().value as string | undefined;
            if (oldestKey) {
                this.readTimestamps.delete(oldestKey);
                logger.debug(`Removed oldest tracked file: ${oldestKey}`);
            } else {
                break;
            }
        }
    }

    private async getModifiedTime(filePath: string): Promise<number> {
        const stat = await fs.stat(filePath);
        return stat.mtimeMs;
    }
}

export const fileTracker = new FileTracker();
