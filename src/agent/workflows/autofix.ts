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

    const TIMEOUT_MS = 10000;
    const TIMEOUT_SENTINEL = Symbol("autofix-timeout");

    let timeoutId: NodeJS.Timeout | null = null;

    try {
        logger.info("Attempting to autofix edit search string...");

        const timeoutPromise = new Promise<typeof TIMEOUT_SENTINEL>((resolve) => {
            timeoutId = setTimeout(() => resolve(TIMEOUT_SENTINEL), TIMEOUT_MS);
        });

        const autofixPromise = (async () => {
            const result = await streamObject({
                model: fixer,
                prompt: fixEditPrompt(fileContent, incorrectSearch),
                schema: autofixEditSchema,
                schemaName: "EditAutofix",
                schemaDescription: "Result of attempting to correct a search string for file editing",
                onError({ error }) {
                    logger.error("Error during edit autofix streaming:", error);
                },
            });
            return await result.object;
        })();

        const raced = (await Promise.race([autofixPromise, timeoutPromise])) as
            | z.infer<typeof autofixEditSchema>
            | typeof TIMEOUT_SENTINEL;

        if (raced === TIMEOUT_SENTINEL) {
            logger.warn("Autofix timed out");
            return null;
        }

        if (raced.success && raced.correctedSearch) {
            if (fileContent.includes(raced.correctedSearch)) {
                logger.info("Autofix for edit successful.", {
                    confidence: raced.confidence,
                    explanation: raced.explanation,
                });
                return raced.correctedSearch;
            }
            logger.warn("Autofix for edit returned a search string not present in the file.");
        }
        return null;
    } catch (e) {
        logger.error("Edit autofixing failed.", e);
        return null;
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}
