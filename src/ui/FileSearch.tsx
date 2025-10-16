import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

type FileSearchProps = {
    query: string;
    visibleFiles: string[];
    totalFiles: number;
    selectedIndex: number;
};

export function FileSearch({ query, visibleFiles, totalFiles, selectedIndex }: FileSearchProps) {
    const hiddenFiles = totalFiles - visibleFiles.length;
    return (
        <Box flexDirection="column" borderStyle="round" borderColor={theme.warning}>
            <Text>Searching for: {query}</Text>
            {visibleFiles.map((file, index) => (
                <Text key={file} color={selectedIndex === index ? theme.info : theme.text}>
                    {file}
                </Text>
            ))}
            {hiddenFiles > 0 && <Text>...and {hiddenFiles} more</Text>}
        </Box>
    );
}
