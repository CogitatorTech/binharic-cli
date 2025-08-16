// src/agent/system-prompt.ts
import { type Config } from "@/config.js";
import { toolModules } from "./tools/definitions/index.js";
import { printNode, zodToTs } from "zod-to-ts";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { osLocale } from "os-locale";
import logger from "@/logger.js";

/**
 * Dynamically gets the user's system locale (language and region).
 * Handles cross-platform differences and provides a safe fallback.
 * @returns A promise that resolves to the user's locale string (e.g., "en-US").
 */
async function getUserLocale(): Promise<string> {
    try {
        const locale = await osLocale();
        return locale.replace("_", "-");
    } catch (e) {
        return "en-US";
    }
}

/**
 * Dynamically gets the user's system timezone.
 * @returns The user's timezone string (e.g., "Europe/Oslo").
 */
function getUserTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
        return "Europe/Oslo";
    }
}

/**
 * Recursively searches for instruction files (TOBI.md, AGENTS.md) upwards from the current directory.
 * @param currentDir The directory to start searching from.
 * @returns The content of the found file, or null if no file is found.
 */
async function findInstructionFile(currentDir: string): Promise<string | null> {
    const instructionFiles = ["TOBI.md", "AGENTS.md"];
    const homeDir = os.homedir();
    let dir = currentDir;
    while (dir !== path.dirname(dir) && dir.startsWith(homeDir)) {
        for (const fileName of instructionFiles) {
            const filePath = path.join(dir, fileName);
            try {
                await fs.access(filePath, fs.constants.R_OK);
                return await fs.readFile(filePath, "utf-8");
            } catch (error) {
                // Ignore permission errors and continue searching
                if (error instanceof Error && (error as NodeJS.ErrnoException).code === "EACCES") {
                    logger.warn(`Permission denied reading ${filePath}, skipping...`);
                }
                // Continue searching for other files
            }
        }
        dir = path.dirname(dir);
    }
    return null;
}

/**
 * Generates the dynamic system prompt for the agent.
 * @param config The application configuration.
 * @returns A promise that resolves to the generated system prompt string.
 */
export async function generateSystemPrompt(config: Config): Promise<string> {
    const cwd = process.cwd();

    // 1. Gather environmental context
    const dirents = await fs.readdir(cwd, { withFileTypes: true });
    const filesAndDirs = dirents.map((d) => (d.isDirectory() ? `${d.name}/` : d.name)).join("\n");
    const osPlatform = os.platform();
    const userLocale = await getUserLocale();
    const userTimezone = getUserTimezone();
    const currentDate = new Date().toLocaleString(userLocale, { timeZone: userTimezone });

    // 2. Find project-specific instructions
    const instructionContent = await findInstructionFile(cwd);

    // 3. Generate tool definitions as TypeScript types
    const toolDefinitions = Object.values(toolModules)
        .map((module) => {
            const { node } = zodToTs(module.schema.shape.arguments);
            const argumentsString = printNode(node);
            return (
                `// ${module.description}\n` +
                `type ${module.schema.shape.name.value} = {\n` +
                `  name: "${module.schema.shape.name.value}";\n` +
                `  arguments: ${argumentsString};\n` +
                `};`
            );
        })
        .join("\n\n");

    // 4. Assemble the prompt
    const promptParts: string[] = [
        `You are Tobi, an autonomous AI software engineer. Your role is to assist the user, named "${config.userName || "User"}", by executing tasks with the tools provided. You operate with maximum efficiency and precision.`,

        `### Environment\n` +
            `* **Operating System:** ${osPlatform}\n` +
            `* **User Locale:** ${userLocale}\n` +
            `* **User Timezone:** ${userTimezone}\n` +
            `* **Current Date & Time:** ${currentDate}\n` +
            `* **Working Directory:** ${cwd}\n` +
            "* **Directory Contents:**\n" +
            "```\n" +
            `${filesAndDirs || "(empty)"}\n` +
            "```",

        // CORRECTED: This new rule set allows for conversation while still prioritizing tool use for tasks.
        "### Rules of Engagement\n" +
            "1.  **Analyze and Plan:** First, analyze the user's request. Formulate a concise, step-by-step plan and state it clearly.\n" +
            "2.  **Execute Autonomously:** After stating your plan, immediately execute the first step by calling the appropriate tool. The system will pause for user approval before the tool runs.\n" +
            "3.  **Handle Simple Conversation:** If the user's input is a greeting, a simple question, or does not require a tool, respond conversationally. DO NOT use a tool if a direct text answer is sufficient.\n" +
            "4.  **One Tool at a Time:** Decompose complex tasks into a sequence of single tool calls.\n" +
            "5.  **Be Concise:** Do not add comments to code unless requested. Avoid conversational filler when executing a task.",
    ];

    if (instructionContent) {
        promptParts.push(
            "### User-Provided Instructions\n" +
                "The user has provided the following project-specific instructions. Adhere to them strictly.\n" +
                "```markdown\n" +
                instructionContent +
                "\n```",
        );
    }

    promptParts.push(
        "### Tool Reference\n" +
            "When a step in your plan requires a tool, you must respond with a single JSON object containing the `tool_calls` property. This object must conform to the following TypeScript definitions.\n\n" +
            "**Example:** To list files, you would respond with:\n" +
            "```json\n" +
            JSON.stringify(
                {
                    tool_calls: [
                        {
                            name: "list",
                            arguments: { path: "." },
                        },
                    ],
                },
                null,
                2,
            ) +
            "\n```\n\n" +
            "**Tool Definitions:**\n" +
            "```typescript\n" +
            toolDefinitions +
            "\n```",
    );

    return promptParts.join("\n\n");
}
