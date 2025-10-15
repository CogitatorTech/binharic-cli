import type { CommandSuggestion } from "@/ui/CommandAutocomplete.js";

export const COMMAND_REGISTRY: CommandSuggestion[] = [
    {
        command: "/help",
        description: "Show available commands and tools",
        category: "system",
    },
    {
        command: "/clear",
        description: "Clear the screen and conversation history",
        category: "system",
    },
    {
        command: "/clearHistory",
        description: "Clear command history",
        category: "system",
    },
    {
        command: "/quit",
        description: "Exit the application",
        category: "system",
    },
    {
        command: "/exit",
        description: "Exit the application",
        category: "system",
    },
    {
        command: "/model",
        description: "Switch to a different model (e.g., /model gpt-5-mini)",
        category: "config",
    },
    {
        command: "/system",
        description: "Set custom system prompt",
        category: "config",
    },
    {
        command: "/add",
        description: "Add context files (e.g., /add README.md config.json)",
        category: "context",
    },
    {
        command: "/models",
        description: "List all available model providers and models",
        category: "config",
    },
    {
        command: "/read_file",
        description: "Read a file from the filesystem",
        category: "tool",
    },
    {
        command: "/read_multiple_files",
        description: "Read multiple files at once (batch operation)",
        category: "tool",
    },
    {
        command: "/list",
        description: "List files and directories",
        category: "tool",
    },
    {
        command: "/search",
        description: "Search for files by name pattern",
        category: "tool",
    },
    {
        command: "/grep_search",
        description: "Search for text within files",
        category: "tool",
    },
    {
        command: "/create",
        description: "Create a new file",
        category: "tool",
    },
    {
        command: "/edit",
        description: "Edit an existing file",
        category: "tool",
    },
    {
        command: "/insert_edit_into_file",
        description: "Apply smart edits to a file",
        category: "tool",
    },
    {
        command: "/bash",
        description: "Execute a bash command",
        category: "tool",
    },
    {
        command: "/run_in_terminal",
        description: "Run a command in a persistent terminal session",
        category: "tool",
    },
    {
        command: "/get_terminal_output",
        description: "Get output from a terminal session",
        category: "tool",
    },
    {
        command: "/get_errors",
        description: "Get compilation or lint errors from files",
        category: "tool",
    },
    {
        command: "/validate",
        description: "Validate file operations or changes",
        category: "tool",
    },
    {
        command: "/fetch",
        description: "Fetch content from a URL",
        category: "tool",
    },
    {
        command: "/mcp",
        description: "Execute Model Context Protocol server commands",
        category: "tool",
    },
    {
        command: "/git_status",
        description: "Show git repository status",
        category: "git",
    },
    {
        command: "/git_log",
        description: "Show git commit history",
        category: "git",
    },
    {
        command: "/git_diff",
        description: "Show git diff of staged/unstaged changes",
        category: "git",
    },
    {
        command: "/git_add",
        description: "Stage files for commit",
        category: "git",
    },
    {
        command: "/git_commit",
        description: "Commit staged changes with a message",
        category: "git",
    },
    {
        command: "/git_branch_list",
        description: "List all branches",
        category: "git",
    },
    {
        command: "/git_branch_current",
        description: "Show current branch",
        category: "git",
    },
    {
        command: "/git_branch_create",
        description: "Create a new branch",
        category: "git",
    },
    {
        command: "/git_branch_switch",
        description: "Switch to a different branch",
        category: "git",
    },
    {
        command: "/diff_files",
        description: "Compare two files and show differences",
        category: "diff",
    },
    {
        command: "/diff_show_changes",
        description: "Show uncommitted changes in the repository",
        category: "diff",
    },
];

export function getCommandSuggestions(query: string): CommandSuggestion[] {
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery || normalizedQuery === "/") {
        return COMMAND_REGISTRY;
    }

    return COMMAND_REGISTRY.filter((cmd) => {
        return (
            cmd.command.toLowerCase().includes(normalizedQuery) ||
            cmd.description.toLowerCase().includes(normalizedQuery)
        );
    });
}

export function getCategoryColor(category?: string): string {
    switch (category) {
        case "system":
            return "yellow";
        case "config":
            return "blue";
        case "context":
            return "magenta";
        case "tool":
            return "cyan";
        case "git":
            return "green";
        case "diff":
            return "red";
        default:
            return "white";
    }
}
