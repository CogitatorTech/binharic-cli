import React from "react";
import { Box, Text } from "ink";
import { tools } from "../agent/tools/definitions/index.js";

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
            borderColor="cyan"
            paddingX={2}
            paddingY={1}
            marginBottom={1}
        >
            <Box flexDirection="column" marginBottom={1}>
                <Text bold color="cyan">
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
                <Text bold color="cyan">
                    Commands:
                </Text>
                <Box flexDirection="column" paddingLeft={1}>
                    <Text>
                        <Text color="yellow">/help</Text> - Show this help message
                    </Text>
                    <Text>
                        <Text color="yellow">/clear</Text> - Clear the screen and conversation
                        history
                    </Text>
                    <Text>
                        <Text color="yellow">/clearHistory</Text> - Clear command history
                    </Text>
                    <Text>
                        <Text color="yellow">/quit</Text> or <Text color="yellow">/exit</Text> -
                        Exit the application
                    </Text>
                    <Text>
                        <Text color="yellow">/model</Text> - Switch to a different model (e.g.,
                        /model gpt-5-mini)
                    </Text>
                    <Text>
                        <Text color="yellow">/system</Text> - Set custom system prompt
                    </Text>
                    <Text>
                        <Text color="yellow">/add</Text> - Add context files (e.g., /add README.md
                        config.json)
                    </Text>
                    <Text>
                        <Text color="yellow">/models</Text> - List all available model providers and
                        models
                    </Text>
                </Box>
            </Box>

            <Box flexDirection="column" marginBottom={1}>
                <Text bold color="cyan">
                    File Tools (prefix with / to execute directly):
                </Text>
                <Box flexDirection="column" paddingLeft={1}>
                    <Text>
                        <Text color="green">read_file</Text> - Read a file from the filesystem
                    </Text>
                    <Text>
                        <Text color="green">read_multiple_files</Text> - Read multiple files at once
                        (batch)
                    </Text>
                    <Text>
                        <Text color="green">list</Text> - List files and directories
                    </Text>
                    <Text>
                        <Text color="green">search</Text> - Search for files by name pattern
                    </Text>
                    <Text>
                        <Text color="green">grep_search</Text> - Search for text within files
                    </Text>
                    <Text>
                        <Text color="green">create</Text> - Create a new file
                    </Text>
                    <Text>
                        <Text color="green">edit</Text> - Edit an existing file
                    </Text>
                    <Text>
                        <Text color="green">insert_edit_into_file</Text> - Apply smart edits to a
                        file
                    </Text>
                    <Text>
                        <Text color="green">get_errors</Text> - Get compilation or lint errors
                    </Text>
                    <Text>
                        <Text color="green">validate</Text> - Validate file operations or changes
                    </Text>
                </Box>
            </Box>

            <Box flexDirection="column" marginBottom={1}>
                <Text bold color="cyan">
                    Execution Tools:
                </Text>
                <Box flexDirection="column" paddingLeft={1}>
                    <Text>
                        <Text color="blue">bash</Text> - Execute a bash command
                    </Text>
                    <Text>
                        <Text color="blue">run_in_terminal</Text> - Run command in persistent
                        terminal
                    </Text>
                    <Text>
                        <Text color="blue">get_terminal_output</Text> - Get output from terminal
                        session
                    </Text>
                    <Text>
                        <Text color="blue">fetch</Text> - Fetch content from a URL
                    </Text>
                    <Text>
                        <Text color="blue">mcp</Text> - Execute Model Context Protocol server
                        commands
                    </Text>
                </Box>
            </Box>

            <Box flexDirection="column" marginBottom={1}>
                <Text bold color="cyan">
                    Git Tools:
                </Text>
                <Box flexDirection="column" paddingLeft={1}>
                    <Text>
                        <Text color="magenta">git_status</Text> - Show repository status
                    </Text>
                    <Text>
                        <Text color="magenta">git_log</Text> - Show commit history
                    </Text>
                    <Text>
                        <Text color="magenta">git_diff</Text> - Show diff of changes
                    </Text>
                    <Text>
                        <Text color="magenta">git_add</Text> - Stage files for commit
                    </Text>
                    <Text>
                        <Text color="magenta">git_commit</Text> - Commit staged changes
                    </Text>
                    <Text>
                        <Text color="magenta">git_branch_list</Text> - List all branches
                    </Text>
                    <Text>
                        <Text color="magenta">git_branch_current</Text> - Show current branch
                    </Text>
                    <Text>
                        <Text color="magenta">git_branch_create</Text> - Create a new branch
                    </Text>
                    <Text>
                        <Text color="magenta">git_branch_switch</Text> - Switch branches
                    </Text>
                </Box>
            </Box>

            <Box flexDirection="column" marginBottom={1}>
                <Text bold color="cyan">
                    Diff Tools:
                </Text>
                <Box flexDirection="column" paddingLeft={1}>
                    <Text>
                        <Text color="red">diff_files</Text> - Compare two files
                    </Text>
                    <Text>
                        <Text color="red">diff_show_changes</Text> - Show uncommitted changes
                    </Text>
                </Box>
            </Box>

            <Box flexDirection="column">
                <Text bold color="cyan">
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
                <Text color="gray" dimColor>
                    Tip: Create BINHARIC.md files to customize interactions with the agent
                </Text>
            </Box>
        </Box>
    );
}
