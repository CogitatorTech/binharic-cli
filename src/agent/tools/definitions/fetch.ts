// src/agent/tools/definitions/fetch.ts
// REFACTORED: Cleaned up for consistency.

import { z } from "zod";
import { compile } from "html-to-text";
import type { ToolDef } from "../common.js";
import { ToolError } from "../../errors.js";

const fetchSchema = z.object({
    name: z.literal("fetch"),
    arguments: z
        .object({
            url: z.string().url().describe("The full URL to fetch, e.g., https://..."),
            stripMarkup: z
                .boolean()
                .optional()
                .default(true)
                .describe("Strip HTML markup and convert to plain text. Defaults to true."),
        })
        .strict(),
});

const converter = compile({ wordwrap: 130 });

async function implementation(args: z.infer<typeof fetchSchema>["arguments"]): Promise<string> {
    try {
        const response = await fetch(args.url);
        const fullText = await response.text();

        if (!response.ok) {
            throw new ToolError(`Request failed with status ${response.status}: ${fullText}`);
        }

        return args.stripMarkup ? converter(fullText) : fullText;
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error instanceof ToolError) throw error;
            throw new ToolError(error.message);
        }
        throw new ToolError("An unknown error occurred during fetch.");
    }
}

export default {
    schema: fetchSchema,
    implementation,
    description: "Fetch the content of a URL.",
} satisfies ToolDef<typeof fetchSchema>;
