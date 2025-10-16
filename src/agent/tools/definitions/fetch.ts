import { z } from "zod";
import { tool } from "ai";
import { compile } from "html-to-text";
import { ToolError } from "../../errors/index.js";

const converter = compile({ wordwrap: 130 });

const MAX_RESPONSE_SIZE = 10 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 30000;

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
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

            try {
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new ToolError(
                        `Request failed with status ${response.status}: ${errorText}`,
                    );
                }

                const contentLength = response.headers?.get("content-length");
                if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
                    throw new ToolError(
                        `Response too large: ${contentLength} bytes exceeds limit of ${MAX_RESPONSE_SIZE} bytes`,
                    );
                }

                const fullText = await response.text();

                if (fullText.length > MAX_RESPONSE_SIZE) {
                    throw new ToolError(
                        `Response too large: ${fullText.length} bytes exceeds limit of ${MAX_RESPONSE_SIZE} bytes`,
                    );
                }

                return stripMarkup ? converter(fullText) : fullText;
            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                if (error.name === "AbortError") {
                    throw new ToolError(`Request timeout after ${DEFAULT_TIMEOUT_MS}ms`);
                }
                if (error instanceof ToolError) throw error;
                throw new ToolError(error.message);
            }
            throw new ToolError("An unknown error occurred during fetch.");
        }
    },
});

export default fetchTool;
