import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
    gitStatusTool,
    gitDiffTool,
    gitLogTool,
    gitAddTool,
    gitCommitTool,
    gitBranchListTool,
    gitBranchCurrentTool,
    gitBranchCreateTool,
    gitBranchSwitchTool,
} from "@/agent/tools/definitions/git.js";
import simpleGit from "simple-git";

vi.mock("simple-git");

describe("Git Tools - Sacred Repository Operations", () => {
    let mockGit: any;

    beforeEach(() => {
        mockGit = {
            status: vi.fn(),
            diff: vi.fn(),
            log: vi.fn(),
            add: vi.fn(),
            commit: vi.fn(),
            branch: vi.fn(),
            revparse: vi.fn(),
            checkoutLocalBranch: vi.fn(),
            checkout: vi.fn(),
        };
        (simpleGit as any).mockReturnValue(mockGit);
    });

    describe("git_status", () => {
        it("should show clean repository status", async () => {
            mockGit.status.mockResolvedValue({
                current: "main",
                ahead: 0,
                behind: 0,
                staged: [],
                modified: [],
                not_added: [],
                deleted: [],
                isClean: () => true,
            });

            const result = await gitStatusTool.execute({}, {} as any);

            expect(result).toContain("Branch: main");
            expect(result).toContain("clean");
        });

        it("should show modified and staged files", async () => {
            mockGit.status.mockResolvedValue({
                current: "feature",
                ahead: 2,
                behind: 1,
                staged: ["file1.ts"],
                modified: ["file2.ts"],
                not_added: ["file3.ts"],
                deleted: [],
                isClean: () => false,
            });

            const result = await gitStatusTool.execute({}, {} as any);

            expect(result).toContain("Branch: feature");
            expect(result).toContain("Ahead by 2");
            expect(result).toContain("Behind by 1");
            expect(result).toContain("file1.ts");
            expect(result).toContain("file2.ts");
            expect(result).toContain("file3.ts");
        });

        it("should handle errors gracefully", async () => {
            mockGit.status.mockRejectedValue(new Error("Not a git repository"));

            await expect(gitStatusTool.execute({}, {} as any)).rejects.toThrow(
                "Failed to get git status",
            );
        });
    });

    describe("git_diff", () => {
        it("should show diff for modified files", async () => {
            const mockDiff = "diff --git a/file.ts b/file.ts\n+new line";
            mockGit.diff.mockResolvedValue(mockDiff);

            const result = await gitDiffTool.execute({}, {} as any);

            expect(result).toBe(mockDiff);
        });

        it("should show staged diff", async () => {
            const mockDiff = "diff --git a/staged.ts b/staged.ts\n+staged change";
            mockGit.diff.mockResolvedValue(mockDiff);

            const result = await gitDiffTool.execute({ staged: true }, {} as any);

            expect(result).toBe(mockDiff);
            expect(mockGit.diff).toHaveBeenCalledWith(["--cached"]);
        });

        it("should handle no changes", async () => {
            mockGit.diff.mockResolvedValue("");

            const result = await gitDiffTool.execute({}, {} as any);

            expect(result).toContain("No changes detected");
        });

        it("should truncate large diffs", async () => {
            const largeDiff = "x".repeat(15000);
            mockGit.diff.mockResolvedValue(largeDiff);

            const result = await gitDiffTool.execute({}, {} as any);

            expect(result.length).toBeLessThan(15000);
            expect(result).toContain("truncated");
        });
    });

    describe("git_log", () => {
        it("should show commit history", async () => {
            mockGit.log.mockResolvedValue({
                all: [
                    {
                        hash: "abc123def456",
                        author_name: "Tech-Priest",
                        author_email: "priest@omnissiah.tech",
                        date: "2025-10-14T12:00:00Z",
                        message: "Fix bug in machine spirit",
                    },
                ],
            });

            const result = await gitLogTool.execute({ count: 10 }, {} as any);

            expect(result).toContain("abc123de");
            expect(result).toContain("Tech-Priest");
            expect(result).toContain("Fix bug");
        });

        it("should handle empty repository", async () => {
            mockGit.log.mockResolvedValue({ all: [] });

            const result = await gitLogTool.execute({ count: 10 }, {} as any);

            expect(result).toContain("No commits found");
        });
    });

    describe("git_add", () => {
        it("should stage files successfully", async () => {
            mockGit.add.mockResolvedValue(undefined);
            mockGit.status.mockResolvedValue({
                staged: ["file1.ts", "file2.ts"],
            });

            const result = await gitAddTool.execute({ files: ["file1.ts"] }, {} as any);

            expect(result).toContain("Successfully staged");
            expect(result).toContain("file1.ts");
            expect(mockGit.add).toHaveBeenCalledWith(["file1.ts"]);
        });

        it("should stage all files with dot", async () => {
            mockGit.add.mockResolvedValue(undefined);
            mockGit.status.mockResolvedValue({
                staged: ["file1.ts", "file2.ts", "file3.ts"],
            });

            const result = await gitAddTool.execute({ files: ["."] }, {} as any);

            expect(result).toContain("Total staged files: 3");
        });
    });

    describe("git_commit", () => {
        it("should commit staged changes", async () => {
            mockGit.status.mockResolvedValue({
                staged: ["file1.ts"],
            });
            mockGit.commit.mockResolvedValue({
                commit: "abc123",
            });

            const result = await gitCommitTool.execute({ message: "Blessed commit" }, {} as any);

            expect(result).toContain("Commit successful");
            expect(result).toContain("abc123");
            expect(result).toContain("Omnissiah");
        });

        it("should fail if no staged files", async () => {
            mockGit.status.mockResolvedValue({
                staged: [],
            });

            await expect(
                gitCommitTool.execute({ message: "Empty commit" }, {} as any),
            ).rejects.toThrow("No staged files");
        });
    });

    describe("git_branch_list", () => {
        it("should list all branches", async () => {
            mockGit.branch.mockResolvedValue({
                current: "main",
                all: ["main", "feature", "develop"],
            });

            const result = await gitBranchListTool.execute({}, {} as any);

            expect(result).toContain("Current branch: main");
            expect(result).toContain("* main");
            expect(result).toContain("feature");
        });

        it("should include remote branches when requested", async () => {
            mockGit.branch.mockResolvedValue({
                current: "main",
                all: ["main", "remotes/origin/main", "remotes/origin/feature"],
            });

            const result = await gitBranchListTool.execute({ remotes: true }, {} as any);

            expect(result).toContain("origin");
            expect(mockGit.branch).toHaveBeenCalledWith(["-a"]);
        });
    });

    describe("git_branch_current", () => {
        it("should return current branch name", async () => {
            mockGit.revparse.mockResolvedValue("feature-branch");

            const result = await gitBranchCurrentTool.execute({}, {} as any);

            expect(result).toContain("feature-branch");
        });
    });

    describe("git_branch_create", () => {
        it("should create branch without switching", async () => {
            mockGit.branch.mockResolvedValue(undefined);

            const result = await gitBranchCreateTool.execute({ name: "new-feature" }, {} as any);

            expect(result).toContain("Created new branch: new-feature");
            expect(result).not.toContain("switched");
        });

        it("should create and checkout branch", async () => {
            mockGit.checkoutLocalBranch.mockResolvedValue(undefined);

            const result = await gitBranchCreateTool.execute(
                { name: "new-feature", checkout: true },
                {} as any,
            );

            expect(result).toContain("Created and switched");
            expect(result).toContain("new-feature");
        });
    });

    describe("git_branch_switch", () => {
        it("should switch to existing branch", async () => {
            mockGit.checkout.mockResolvedValue(undefined);

            const result = await gitBranchSwitchTool.execute({ name: "develop" }, {} as any);

            expect(result).toContain("Switched to branch: develop");
            expect(mockGit.checkout).toHaveBeenCalledWith("develop");
        });
    });
});
