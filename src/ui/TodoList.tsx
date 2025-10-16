import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { theme } from "./theme.js";
import type { Config } from "@/config.js";

export interface TodoItem {
    id: string;
    description: string;
    status: "pending" | "in-progress" | "completed" | "failed";
    startTime?: Date;
    endTime?: Date;
}

interface TodoListProps {
    todos: TodoItem[];
    visible: boolean;
    compact?: boolean;
    maxVisible?: number;
}

export const TodoList: React.FC<TodoListProps> = ({
    todos,
    visible,
    compact = false,
    maxVisible = 5,
}) => {
    if (!visible || todos.length === 0) {
        return null;
    }

    const activeTodos = todos.filter((t) => t.status !== "completed");
    const completedCount = todos.filter((t) => t.status === "completed").length;
    const totalCount = todos.length;

    const displayTodos = compact ? activeTodos.slice(0, maxVisible) : activeTodos;
    const hiddenCount = activeTodos.length - displayTodos.length;

    const getStatusIcon = (status: TodoItem["status"]) => {
        switch (status) {
            case "pending":
                return "○";
            case "in-progress":
                return "●";
            case "completed":
                return "✓";
            case "failed":
                return "✗";
        }
    };

    const getStatusColor = (status: TodoItem["status"]) => {
        switch (status) {
            case "pending":
                return theme.dim;
            case "in-progress":
                return theme.primary;
            case "completed":
                return theme.success;
            case "failed":
                return theme.error;
        }
    };

    if (compact) {
        return (
            <Box flexDirection="column" marginY={1}>
                <Text dimColor>
                    {" "}
                    Steps: {completedCount} of {totalCount}
                </Text>
                {displayTodos.map((todo) => (
                    <Box key={todo.id} marginLeft={1}>
                        {todo.status === "in-progress" && (
                            <Text color={theme.primary}>
                                <Spinner type="dots" />
                            </Text>
                        )}
                        <Text color={getStatusColor(todo.status)}>
                            {" "}
                            {getStatusIcon(todo.status)} {todo.description}
                        </Text>
                    </Box>
                ))}
                {hiddenCount > 0 && (
                    <Box marginLeft={2}>
                        <Text dimColor>... and {hiddenCount} more</Text>
                    </Box>
                )}
            </Box>
        );
    }

    return (
        <Box
            flexDirection="column"
            borderStyle="round"
            borderColor={theme.border}
            paddingX={1}
            marginY={1}
        >
            <Text bold>
                Progress: {completedCount}/{totalCount}
            </Text>
            <Box flexDirection="column" marginTop={1}>
                {displayTodos.map((todo) => (
                    <Box key={todo.id}>
                        {todo.status === "in-progress" && (
                            <Text color={theme.primary}>
                                <Spinner type="dots" />
                            </Text>
                        )}
                        <Text color={getStatusColor(todo.status)}>
                            {" "}
                            {getStatusIcon(todo.status)} {todo.description}
                        </Text>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default TodoList;

export type OutputStyle = "default" | "explanatory" | "learning" | "concise" | "verbose";

export interface OutputStyleConfig {
    name: OutputStyle;
    systemPromptAddition: string;
    description: string;
}

export const OUTPUT_STYLES: Record<OutputStyle, OutputStyleConfig> = {
    default: {
        name: "default",
        systemPromptAddition: "",
        description: "Standard interaction mode",
    },
    explanatory: {
        name: "explanatory",
        systemPromptAddition: `
You should be highly educational in your responses. When making implementation choices:
- Explain WHY you chose a particular approach
- Discuss alternative solutions you considered
- Point out trade-offs in your decisions
- Reference best practices and design patterns
- Help the user understand the reasoning behind your actions

Think of yourself as a mentor teaching through action.`,
        description: "Educational mode - explains implementation choices and reasoning",
    },
    learning: {
        name: "learning",
        systemPromptAddition: `
You should work collaboratively with the user to help them learn:
- Break down complex tasks into smaller, manageable steps
- Ask the user to implement simpler parts themselves while you handle complex ones
- Provide hints and guidance rather than complete solutions when appropriate
- Explain concepts as you go
- Verify the user's understanding before proceeding

The goal is active learning - keep the user engaged and coding alongside you.`,
        description: "Collaborative learning mode - guides user to implement parts themselves",
    },
    concise: {
        name: "concise",
        systemPromptAddition: `
Be extremely concise and to-the-point:
- Minimize explanations unless asked
- Focus on getting work done efficiently
- Only mention critical information
- Use brief status updates`,
        description: "Minimal output - focuses on getting work done quickly",
    },
    verbose: {
        name: "verbose",
        systemPromptAddition: `
Provide detailed, comprehensive responses:
- Explain every step thoroughly
- Include all relevant context and background
- Discuss edge cases and potential issues
- Provide extensive documentation in comments
- Share detailed reasoning for all decisions`,
        description: "Detailed output - comprehensive explanations and documentation",
    },
};

export function getOutputStylePrompt(style: OutputStyle): string {
    return OUTPUT_STYLES[style].systemPromptAddition;
}

export function getOutputStyle(config: Config): OutputStyle {
    const style = (config as any).outputStyle;
    if (style && style in OUTPUT_STYLES) {
        return style as OutputStyle;
    }
    return "default";
}

export function listOutputStyles(): OutputStyleConfig[] {
    return Object.values(OUTPUT_STYLES);
}
