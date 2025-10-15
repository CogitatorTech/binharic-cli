import React from "react";
import { Box, Text } from "ink";

export interface CommandSuggestion {
    command: string;
    description: string;
    category?: string;
}

interface CommandAutocompleteProps {
    query: string;
    suggestions: CommandSuggestion[];
    selectedIndex: number;
    maxVisible?: number;
}

export function CommandAutocomplete({
    query,
    suggestions,
    selectedIndex,
    maxVisible = 10,
}: CommandAutocompleteProps) {
    const visibleSuggestions = suggestions.slice(0, maxVisible);
    const hasMore = suggestions.length > maxVisible;

    return (
        <Box
            flexDirection="column"
            borderStyle="round"
            borderColor="cyan"
            paddingX={1}
            marginBottom={1}
        >
            {visibleSuggestions.map((suggestion, index) => {
                const isSelected = index === selectedIndex;
                return (
                    <Box key={suggestion.command} flexDirection="row">
                        <Box width={20}>
                            <Text
                                color={isSelected ? "cyan" : "white"}
                                bold={isSelected}
                                inverse={isSelected}
                            >
                                {isSelected ? " ▶ " : "   "}
                                {suggestion.command}
                            </Text>
                        </Box>
                        <Box flexGrow={1} marginLeft={2}>
                            <Text color="gray" dimColor={!isSelected}>
                                {suggestion.description}
                            </Text>
                        </Box>
                    </Box>
                );
            })}
            {hasMore && (
                <Box justifyContent="center" marginTop={1}>
                    <Text color="gray" dimColor>
                        ▼ ({suggestions.length - maxVisible} more - keep typing to filter)
                    </Text>
                </Box>
            )}
            <Box justifyContent="center" marginTop={1} borderTop borderColor="gray">
                <Text color="gray" dimColor>
                    ({selectedIndex + 1}/{suggestions.length}) ↑↓ to navigate, Enter to select, Esc
                    to cancel
                </Text>
            </Box>
        </Box>
    );
}
