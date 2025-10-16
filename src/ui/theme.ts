export const theme = {
    // Brand and primary accents
    primary: "cyan" as const,
    accent: "magenta" as const,
    info: "blue" as const,

    // Semantic colors
    success: "green" as const,
    warning: "yellow" as const,
    error: "red" as const,

    // Text and borders
    text: "white" as const,
    dim: "gray" as const,
    border: "gray" as const,
    assistantBorder: "green" as const,
    codeBlockBorder: "gray" as const,
    codeInline: "yellow" as const,
    userPrompt: "white" as const,
};

export type Theme = typeof theme;
