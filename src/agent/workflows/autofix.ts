import { createOpenAI } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { z, ZodRawShape } from "zod";
import logger from "@/logger.js";

const getFixerClient = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        logger.warn("Autofix requires OPENAI_API_KEY to be set for a fixer model.");
        return null;
    }
    return createOpenAI({ apiKey })("gpt-5-mini");
};

const fixJsonPrompt = (badJson: string) => `
The following string is invalid JSON produced by an AI. Your task is to fix it.
Respond ONLY with the corrected JSON object. Do not add any commentary, just the JSON.

Invalid JSON:
${badJson}
`;

export async function autofixJson(
    schema: z.ZodObject<ZodRawShape>,
    brokenJson: string,
): Promise<z.infer<typeof schema> | null> {
    const fixer = getFixerClient();
    if (!fixer) return null;

    try {
        const { object } = await streamObject({
            model: fixer,
            prompt: fixJsonPrompt(brokenJson),
            schema: schema,
            schemaName: "FixedJsonObject",
            schemaDescription: "The corrected JSON object that conforms to the expected schema",
            onError({ error }) {
                logger.error("Error during JSON autofix streaming:", error);
            },
        });
        const result = await object;
        return schema.parse(result);
    } catch (e) {
        logger.error("JSON autofixing failed.", e);
        return null;
    }
}

const fixEditPrompt = (fileContent: string, incorrectSearch: string) => `
The user wants to replace a block of code in the following file, but the 'search' string they provided was not found.
Your task is to find the most similar and logical block of code in the file and return it.

File content:
---
${fileContent}
---

Incorrect 'search' string:
---
${incorrectSearch}
---

Analyze the file content and the incorrect search string.
If you can with high confidence identify the correct block of code the user intended to search for, set "success" to true and provide the exact, corrected search string in "correctedSearch".
The "correctedSearch" MUST be present verbatim in the file content.
If you cannot find a suitable replacement, set "success" to false.
Respond ONLY with the JSON object.
`;

const autofixEditSchema = z.object({
    success: z.boolean().describe("Whether the search string was successfully corrected"),
    correctedSearch: z
        .string()
        .optional()
        .describe("The exact corrected search string that exists in the file"),
    confidence: z
        .enum(["high", "medium", "low"])
        .optional()
        .describe("Confidence level of the correction"),
    explanation: z.string().optional().describe("Brief explanation of what was corrected"),
});

export async function autofixEdit(
    fileContent: string,
    incorrectSearch: string,
): Promise<string | null> {
    const fixer = getFixerClient();
    if (!fixer) return null;

    try {
        logger.info("Attempting to autofix edit search string...");

        let timeoutId: NodeJS.Timeout | null = null;

        const timeoutPromise = new Promise<null>((_, reject) => {
            timeoutId = setTimeout(
                () => reject(new Error("Autofix timeout after 10 seconds")),
                10000,
            );
        });

        const autofixPromise = (async () => {
            const result = await streamObject({
                model: fixer,
                prompt: fixEditPrompt(fileContent, incorrectSearch),
                schema: autofixEditSchema,
                schemaName: "EditAutofix",
                schemaDescription:
                    "Result of attempting to correct a search string for file editing",
                onError({ error }) {
                    logger.error("Error during edit autofix streaming:", error);
                },
            });

            return await result.object;
        })();

        const result = await Promise.race([autofixPromise, timeoutPromise]);

        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        if (!result) {
            logger.warn("Autofix timed out");
            return null;
        }

        if (result.success && result.correctedSearch) {
            if (fileContent.includes(result.correctedSearch)) {
                logger.info("Autofix for edit successful.", {
                    confidence: result.confidence,
                    explanation: result.explanation,
                });
                return result.correctedSearch;
            }
            logger.warn("Autofix for edit returned a search string not present in the file.");
        }
        return null;
    } catch (e) {
        logger.error("Edit autofixing failed.", e);
        return null;
    }
}
