import { z } from "zod";
import { tool } from "ai";
import simpleGit from "simple-git";
import { ToolError } from "../../errors.js";
import logger from "@/logger.js";

export const gitStatusTool = tool({
    description:
        "Get the current git status of the repository. Shows staged, modified, and untracked files. The machine spirit reveals the state of the sacred code repository.",
    inputSchema: z.object({}).strict(),
    execute: async () => {
        try {
            const git = simpleGit();
            const status = await git.status();

            const output = [];
            output.push(`Branch: ${status.current || "detached HEAD"}`);

            if (status.ahead > 0) output.push(`Ahead by ${status.ahead} commits`);
            if (status.behind > 0) output.push(`Behind by ${status.behind} commits`);

            if (status.staged.length > 0) {
                output.push(`\nStaged files (${status.staged.length}):`);
                status.staged.forEach((file) => output.push(`  + ${file}`));
            }

            if (status.modified.length > 0) {
                output.push(`\nModified files (${status.modified.length}):`);
                status.modified.forEach((file) => output.push(`  M ${file}`));
            }

            if (status.not_added.length > 0) {
                output.push(`\nUntracked files (${status.not_added.length}):`);
                status.not_added.forEach((file) => output.push(`  ? ${file}`));
            }

            if (status.deleted.length > 0) {
                output.push(`\nDeleted files (${status.deleted.length}):`);
                status.deleted.forEach((file) => output.push(`  D ${file}`));
            }

            if (status.isClean()) {
                output.push("\nWorking directory clean - the repository is blessed and pure!");
            }

            return output.join("\n");
        } catch (error) {
            logger.error("Git status failed:", error);
            throw new ToolError(
                `Failed to get git status: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    },
});

export const gitDiffTool = tool({
    description:
        "Show changes in files. If no files specified, shows all changes. Reveals the sacred modifications made to the code.",
    inputSchema: z
        .object({
            files: z
                .array(z.string())
                .optional()
                .describe("Optional array of file paths to show diffs for."),
            staged: z
                .boolean()
                .optional()
                .default(false)
                .describe("Show staged changes instead of working directory changes."),
        })
        .strict(),
    execute: async ({ files, staged = false }) => {
        try {
            const git = simpleGit();
            let diff: string;

            if (staged) {
                diff = await git.diff(["--cached", ...(files || [])]);
            } else {
                diff = await git.diff(files || []);
            }

            if (!diff || diff.trim().length === 0) {
                return "No changes detected. The code remains pure and unmodified.";
            }

            if (diff.length > 10000) {
                return (
                    diff.substring(0, 10000) +
                    "\n\n... (diff truncated - exceeds 10KB. Use git_diff with specific files for detailed view)"
                );
            }

            return diff;
        } catch (error) {
            logger.error("Git diff failed:", error);
            throw new ToolError(
                `Failed to get diff: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    },
});

export const gitLogTool = tool({
    description: "Show commit history. The sacred chronicles of changes made to the repository.",
    inputSchema: z
        .object({
            count: z
                .number()
                .int()
                .positive()
                .optional()
                .default(10)
                .describe("Number of commits to show. Defaults to 10."),
            filePath: z
                .string()
                .optional()
                .describe("Optional file path to show history for specific file."),
        })
        .strict(),
    execute: async ({ count = 10, filePath }) => {
        try {
            const git = simpleGit();
            const options: any = { maxCount: count };
            if (filePath) {
                options.file = filePath;
            }

            const log = await git.log(options);

            if (log.all.length === 0) {
                return "No commits found. The repository awaits its first sacred inscription.";
            }

            const output = log.all.map((commit) => {
                const date = new Date(commit.date);
                const dateStr = date.toLocaleString();
                return `Commit: ${commit.hash.substring(0, 8)}\nAuthor: ${commit.author_name} <${commit.author_email}>\nDate: ${dateStr}\n\n    ${commit.message}\n`;
            });

            return output.join("\n---\n\n");
        } catch (error) {
            logger.error("Git log failed:", error);
            throw new ToolError(
                `Failed to get commit log: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    },
});

export const gitAddTool = tool({
    description:
        "Stage files for commit. Prepares the sacred files for permanent inscription in the repository.",
    inputSchema: z
        .object({
            files: z
                .array(z.string())
                .min(1)
                .describe("Array of file paths to stage. Use '.' to stage all changes."),
        })
        .strict(),
    execute: async ({ files }) => {
        try {
            const git = simpleGit();
            await git.add(files);

            const status = await git.status();
            const stagedCount = status.staged.length;

            return `Successfully staged ${files.join(", ")}. Total staged files: ${stagedCount}. The files are prepared for the sacred commit ritual.`;
        } catch (error) {
            logger.error("Git add failed:", error);
            throw new ToolError(
                `Failed to stage files: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    },
});

export const gitCommitTool = tool({
    description:
        "Commit staged changes with a message. Inscribes the changes into the eternal repository archives. The Omnissiah preserves all committed code.",
    inputSchema: z
        .object({
            message: z.string().min(1).describe("Commit message describing the changes."),
        })
        .strict(),
    execute: async ({ message }) => {
        try {
            const git = simpleGit();
            const status = await git.status();

            if (status.staged.length === 0) {
                throw new ToolError(
                    "No staged files to commit. Use git_add to stage files first. The ritual requires preparation.",
                );
            }

            const result = await git.commit(message);

            return `Commit successful! Hash: ${result.commit}\nFiles changed: ${status.staged.length}\nCommit blessed by the Omnissiah and inscribed in the repository.`;
        } catch (error) {
            logger.error("Git commit failed:", error);
            if (error instanceof ToolError) {
                throw error;
            }
            throw new ToolError(
                `Failed to commit: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    },
});

export const gitBranchListTool = tool({
    description:
        "List all branches in the repository. Shows both local and remote branches. Reveals all parallel timelines of the codebase.",
    inputSchema: z
        .object({
            remotes: z
                .boolean()
                .optional()
                .default(false)
                .describe("Include remote branches in the list."),
        })
        .strict(),
    execute: async ({ remotes = false }) => {
        try {
            const git = simpleGit();
            const branches = await git.branch(remotes ? ["-a"] : []);

            const output = [];
            output.push(`Current branch: ${branches.current}\n`);
            output.push("Branches:");

            branches.all.forEach((branch) => {
                const marker = branch === branches.current ? "* " : "  ";
                output.push(`${marker}${branch}`);
            });

            return output.join("\n");
        } catch (error) {
            logger.error("Git branch list failed:", error);
            throw new ToolError(
                `Failed to list branches: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    },
});

export const gitBranchCurrentTool = tool({
    description:
        "Get the name of the current branch. Reveals which sacred timeline of code development is active.",
    inputSchema: z.object({}).strict(),
    execute: async () => {
        try {
            const git = simpleGit();
            const branch = await git.revparse(["--abbrev-ref", "HEAD"]);
            return `Current branch: ${branch.trim()}`;
        } catch (error) {
            logger.error("Git current branch failed:", error);
            throw new ToolError(
                `Failed to get current branch: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    },
});

export const gitBranchCreateTool = tool({
    description:
        "Create a new branch. Optionally switch to it immediately. Spawns a new timeline for code development.",
    inputSchema: z
        .object({
            name: z.string().min(1).describe("Name of the new branch to create."),
            checkout: z
                .boolean()
                .optional()
                .default(false)
                .describe("Switch to the new branch after creating it."),
        })
        .strict(),
    execute: async ({ name, checkout = false }) => {
        try {
            const git = simpleGit();
            if (checkout) {
                await git.checkoutLocalBranch(name);
                return `Created and switched to new branch: ${name}. The new timeline is now active.`;
            } else {
                await git.branch([name]);
                return `Created new branch: ${name}. Use git_branch_switch to activate this timeline.`;
            }
        } catch (error) {
            logger.error("Git branch create failed:", error);
            throw new ToolError(
                `Failed to create branch: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    },
});

export const gitBranchSwitchTool = tool({
    description: "Switch to a different branch. Changes the active timeline of code development.",
    inputSchema: z
        .object({
            name: z.string().min(1).describe("Name of the branch to switch to."),
        })
        .strict(),
    execute: async ({ name }) => {
        try {
            const git = simpleGit();
            await git.checkout(name);
            return `Switched to branch: ${name}. The timeline has shifted to this sacred branch.`;
        } catch (error) {
            logger.error("Git branch switch failed:", error);
            throw new ToolError(
                `Failed to switch branch: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
    },
});

export default {
    git_status: gitStatusTool,
    git_diff: gitDiffTool,
    git_log: gitLogTool,
    git_add: gitAddTool,
    git_commit: gitCommitTool,
    git_branch_list: gitBranchListTool,
    git_branch_current: gitBranchCurrentTool,
    git_branch_create: gitBranchCreateTool,
    git_branch_switch: gitBranchSwitchTool,
};
