import fs from "fs/promises";
import path from "path";
import { FileExistsError, FileOutdatedError } from "./errors.js";

export class FileTracker {
    private readTimestamps = new Map<string, number>();

    async read(filePath: string): Promise<string> {
        const absolutePath = path.resolve(filePath);
        const content = await fs.readFile(absolutePath, "utf8");
        const modified = await this.getModifiedTime(absolutePath);
        this.readTimestamps.set(absolutePath, modified);
        return content;
    }

    async write(filePath: string, content: string): Promise<void> {
        const absolutePath = path.resolve(filePath);
        const dir = path.dirname(absolutePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(absolutePath, content, "utf8");
        const modified = await this.getModifiedTime(absolutePath);
        this.readTimestamps.set(absolutePath, modified);
    }

    async assertCanCreate(filePath: string): Promise<void> {
        try {
            await fs.access(filePath);
            throw new FileExistsError(
                `File already exists at ${filePath}. Use the 'edit' tool to modify it.`,
            );
        } catch (error) {
            if (error instanceof FileExistsError) throw error;
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
    }

    async assertCanEdit(filePath: string): Promise<void> {
        const absolutePath = path.resolve(filePath);
        if (!this.readTimestamps.has(absolutePath)) {
            throw new FileOutdatedError(
                `File has not been read yet. Please read the file first before editing.`,
            );
        }

        const lastReadTime = this.readTimestamps.get(absolutePath)!;
        let currentModifiedTime;
        try {
            currentModifiedTime = await this.getModifiedTime(absolutePath);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                throw new FileOutdatedError(
                    "File seems to have been deleted after it was last read.",
                );
            }
            throw error;
        }

        if (currentModifiedTime > lastReadTime) {
            this.readTimestamps.delete(absolutePath);
            throw new FileOutdatedError(
                "File was modified since it was last read. Please read the file again to get the latest version.",
            );
        }
    }

    private async getModifiedTime(filePath: string): Promise<number> {
        const stat = await fs.stat(filePath);
        return stat.mtimeMs;
    }
}

export const fileTracker = new FileTracker();
