import type { Config } from "@/config.js";

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

