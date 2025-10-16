import { type Config } from "@/config.js";
import { tools } from "../tools/definitions/index.js";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { osLocale } from "os-locale";
import logger from "@/logger.js";
import { getOutputStyle, getOutputStylePrompt } from "./outputStyles.js";

async function getUserLocale(): Promise<string> {
    try {
        const locale = await osLocale();
        return locale.replace("_", "-");
    } catch (e) {
        return "en-US";
    }
}

function getUserTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
        return "Europe/Oslo";
    }
}

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
                if (error instanceof Error && (error as NodeJS.ErrnoException).code === "EACCES") {
                    logger.warn(`Permission denied reading ${filePath}, skipping...`);
                }
            }
        }
        dir = path.dirname(dir);
    }
    return null;
}

export async function generateSystemPrompt(config: Config): Promise<string> {
    const cwd = process.cwd();

    const dirents = await fs.readdir(cwd, { withFileTypes: true });
    const filesAndDirs = dirents.map((d) => (d.isDirectory() ? `${d.name}/` : d.name)).join("\n");
    const osPlatform = os.platform();
    const userLocale = await getUserLocale();
    const userTimezone = getUserTimezone();
    const currentDate = new Date().toLocaleString(userLocale, { timeZone: userTimezone });

    const instructionContent = await findInstructionFile(cwd);

    const toolDefinitions = Object.entries(tools)
        .map(([name, tool]) => {
            return `// ${tool.description || name}\nTool: ${name}`;
        })
        .join("\n\n");

    const promptParts: string[] = [
        `You are Binharic, a Tech-Priest of the Adeptus Mechanicus serving as an autonomous AI software engineer. Your role is to assist the user, named "${config.userName || "User"}", by executing tasks with the sacred tools provided by the Omnissiah. You operate with maximum efficiency and precision, honoring the Machine God through flawless code.`,

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

        "### Operating Principles\n" +
            "1.  **Transparency First:** For complex tasks requiring multiple steps or tools, ALWAYS explain your plan first before taking action. State:\n" +
            "    - What you understand the task to be\n" +
            "    - Your approach and reasoning\n" +
            "    - What steps you will take\n" +
            "    - Potential risks or considerations\n" +
            "    For simple queries (greetings, single questions), respond naturally without elaborate planning.\n" +
            "2.  **Ground Truth Validation:** After using tools that modify state (file edits, creations, deletions, command execution), ALWAYS verify the results:\n" +
            "    - After editing a file, read it back to confirm changes\n" +
            "    - After running commands, check outputs for errors\n" +
            "    - After creating files, verify they exist with correct content\n" +
            "    - State explicitly what you verified and the outcome\n" +
            "3.  **Progressive Disclosure:** Break complex tasks into clear steps. Execute one step at a time, explain the result, then proceed.\n" +
            "4.  **Workflow Selection:** For complex multi-step tasks, consider using the execute_workflow tool.\n" +
            "5.  **Acknowledge Uncertainty:** When unsure about an approach, state your confidence level and reasoning. Propose alternatives when appropriate.\n" +
            "6.  **Tool Usage Philosophy:** Use tools purposefully. Read before writing. Understand before modifying. Verify after changing.\n" +
            "7.  **Error Recovery:** When encountering errors, explain what went wrong, propose alternatives, and learn from mistakes.\n" +
            "8.  **Task Completion:** When accomplished, summarize what was done, verify final state, and state completion explicitly.",
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

    if (config.systemPrompt) {
        promptParts.push(`### Custom System Prompt\n${config.systemPrompt}`);
    }

    promptParts.push(
        "### Available Tools\n" +
            "You have access to the following tools. The LLM framework will provide you with the exact schemas.\n" +
            "```typescript\n" +
            toolDefinitions +
            "\n```",
    );

    const basePrompt = promptParts.join("\n\n");

    const outputStyle = getOutputStyle(config);
    const styleAddition = getOutputStylePrompt(outputStyle);

    return `${basePrompt}${styleAddition ? '\n\n' + styleAddition : ''}`;
}
