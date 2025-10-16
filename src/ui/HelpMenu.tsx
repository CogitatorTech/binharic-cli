import React from "react";
import { Box, Text } from "ink";
import { tools } from "../agent/tools/definitions/index.js";
import { theme } from "./theme.js";

const staticCommands = [
    {
        command: "/help",
        description: "Show this help message",
    },
    {
        command: "/clear",
        description: "Clear the conversation output",
    },
    {
        command: "/clearHistory",
        description: "Clear the command history",
    },
    {
        command: "/quit",
        description: "Exit the application",
    },
];

const dynamicCommands = Object.entries(tools).map(([name, tool]) => ({
    command: `/${name}`,
    description: tool.description || `Execute ${name} tool`,
}));

const allCommands = [...staticCommands, ...dynamicCommands];

export function HelpMenu() {
    return (
        <Box
            flexDirection="column"
            borderStyle="round"
            borderColor={theme.primary}
            paddingX={2}
            paddingY={1}
            marginBottom={1}
        >
            <Box flexDirection="column" marginBottom={1}>
                <Text bold color={theme.primary}>
                    Basics:
                </Text>
                <Text>
                    Add context: Use @ to specify files for context (e.g., @src/myFile.ts) to target
                    specific files.
                </Text>
                <Text>
                    Commands: Type / to see available commands with autocomplete suggestions.
                </Text>
            </Box>

            <Box flexDirection="column" marginBottom={1}>
                <Text bold color={theme.primary}>
                    Commands:
                </Text>
                <Box flexDirection="column" paddingLeft={1}>
                    <Text>
                        <Text color={theme.warning}>/help</Text> - Show this help message
                    </Text>
                    <Text>
                        <Text color={theme.warning}>/clear</Text> - Clear the screen and
                        conversation history
                    </Text>
                    <Text>
                        <Text color={theme.warning}>/clearHistory</Text> - Clear command history
                    </Text>
                    <Text>
                        <Text color={theme.warning}>/quit</Text> or{" "}
                        <Text color={theme.warning}>/exit</Text> - Exit the application
                    </Text>
                    <Text>
                        <Text color={theme.warning}>/model</Text> - Switch to a different model
                        (e.g., /model gpt-5-mini)
                    </Text>
                    <Text>
                        <Text color={theme.warning}>/system</Text> - Set custom system prompt
                    </Text>
                    <Text>
                        <Text color={theme.warning}>/add</Text> - Add context files (e.g., /add
                        README.md config.json)
                    </Text>
                    <Text>
                        <Text color={theme.warning}>/models</Text> - List all available model
                        providers and models
                    </Text>
                </Box>
            </Box>

            <Box flexDirection="column" marginBottom={1}>
                <Text bold color={theme.primary}>
                    File Tools (prefix with / to execute directly):
                </Text>
                <Box flexDirection="column" paddingLeft={1}>
                    <Text>
                        <Text color={theme.success}>read_file</Text> - Read a file from the
                        filesystem
                    </Text>
                    <Text>
                        <Text color={theme.success}>read_multiple_files</Text> - Read multiple files
                        at once (batch)
                    </Text>
                    <Text>
                        <Text color={theme.success}>list</Text> - List files and directories
                    </Text>
                    <Text>
                        <Text color={theme.success}>search</Text> - Search for files by name pattern
                    </Text>
                    <Text>
                        <Text color={theme.success}>grep_search</Text> - Search for text within
                        files
                    </Text>
                    <Text>
                        <Text color={theme.success}>create</Text> - Create a new file
                    </Text>
                    <Text>
                        <Text color={theme.success}>edit</Text> - Edit an existing file
                    </Text>
                    <Text>
                        <Text color={theme.success}>insert_edit_into_file</Text> - Apply smart edits
                        to a file
                    </Text>
                    <Text>
                        <Text color={theme.success}>get_errors</Text> - Get compilation or lint
                        errors
                    </Text>
                    <Text>
                        <Text color={theme.success}>validate</Text> - Validate file operations or
                        changes
                    </Text>
                </Box>
            </Box>

            <Box flexDirection="column" marginBottom={1}>
                <Text bold color={theme.primary}>
                    Execution Tools:
                </Text>
                <Box flexDirection="column" paddingLeft={1}>
                    <Text>
                        <Text color={theme.info}>bash</Text> - Execute a bash command
                    </Text>
                    <Text>
                        <Text color={theme.info}>run_in_terminal</Text> - Run command in persistent
                        terminal
                    </Text>
                    <Text>
                        <Text color={theme.info}>get_terminal_output</Text> - Get output from
                        terminal session
                    </Text>
                    <Text>
                        <Text color={theme.info}>fetch</Text> - Fetch content from a URL
                    </Text>
                    <Text>
                        <Text color={theme.info}>mcp</Text> - Execute Model Context Protocol server
                        commands
                    </Text>
                </Box>
            </Box>

            <Box flexDirection="column" marginBottom={1}>
                <Text bold color={theme.primary}>
                    Git Tools:
                </Text>
                <Box flexDirection="column" paddingLeft={1}>
                    <Text>
                        <Text color={theme.accent}>git_status</Text> - Show repository status
                    </Text>
                    <Text>
                        <Text color={theme.accent}>git_log</Text> - Show commit history
                    </Text>
                    <Text>
                        <Text color={theme.accent}>git_diff</Text> - Show diff of changes
                    </Text>
                    <Text>
                        <Text color={theme.accent}>git_add</Text> - Stage files for commit
                    </Text>
                    <Text>
                        <Text color={theme.accent}>git_commit</Text> - Commit staged changes
                    </Text>
                    <Text>
                        <Text color={theme.accent}>git_branch_list</Text> - List all branches
                    </Text>
                    <Text>
                        <Text color={theme.accent}>git_branch_current</Text> - Show current branch
                    </Text>
                    <Text>
                        <Text color={theme.accent}>git_branch_create</Text> - Create a new branch
                    </Text>
                    <Text>
                        <Text color={theme.accent}>git_branch_switch</Text> - Switch branches
                    </Text>
                </Box>
            </Box>

            <Box flexDirection="column" marginBottom={1}>
                <Text bold color={theme.primary}>
                    Diff Tools:
                </Text>
                <Box flexDirection="column" paddingLeft={1}>
                    <Text>
                        <Text color={theme.error}>diff_files</Text> - Compare two files
                    </Text>
                    <Text>
                        <Text color={theme.error}>diff_show_changes</Text> - Show uncommitted
                        changes
                    </Text>
                </Box>
            </Box>

            <Box flexDirection="column">
                <Text bold color={theme.primary}>
                    Keyboard Shortcuts:
                </Text>
                <Box flexDirection="column" paddingLeft={1}>
                    <Text>
                        <Text bold>Up/Down</Text> - Cycle through command history
                    </Text>
                    <Text>
                        <Text bold>Ctrl+L</Text> - Clear the screen
                    </Text>
                    <Text>
                        <Text bold>Ctrl+C</Text> - Quit application
                    </Text>
                    <Text>
                        <Text bold>Tab</Text> - Complete command in autocomplete menu
                    </Text>
                    <Text>
                        <Text bold>Esc</Text> - Cancel autocomplete/file search
                    </Text>
                    <Text>
                        <Text bold>Enter</Text> - Send message or confirm selection
                    </Text>
                    <Text>
                        <Text bold>@filename</Text> - Start file search and autocomplete
                    </Text>
                    <Text>
                        <Text bold>/command</Text> - Start command autocomplete
                    </Text>
                </Box>
            </Box>

            <Box marginTop={1} justifyContent="center">
                <Text color={theme.dim} dimColor>
                    Tip: Create a BINHARIC.md file to customize interactions with the agent
                </Text>
            </Box>
        </Box>
    );
}
