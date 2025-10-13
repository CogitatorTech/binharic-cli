import { z } from "zod";
import { tool } from "ai";
import { compile } from "html-to-text";
import { ToolError } from "../../errors.js";

const converter = compile({ wordwrap: 130 });

export const fetchTool = tool({
    description: "Fetch the content of a URL.",
    inputSchema: z
        .object({
            url: z.string().url().describe("The full URL to fetch, e.g., https://..."),
            stripMarkup: z
                .boolean()
                .optional()
                .default(true)
                .describe("Strip HTML markup and convert to plain text. Defaults to true."),
        })
        .strict(),
    execute: async ({ url, stripMarkup = true }) => {
        try {
            const response = await fetch(url);
            const fullText = await response.text();

            if (!response.ok) {
                throw new ToolError(`Request failed with status ${response.status}: ${fullText}`);
            }

            return stripMarkup ? converter(fullText) : fullText;
        } catch (error: unknown) {
            if (error instanceof Error) {
                if (error instanceof ToolError) throw error;
                throw new ToolError(error.message);
            }
            throw new ToolError("An unknown error occurred during fetch.");
        }
    },
});

export default fetchTool;
