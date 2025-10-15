import logger from "@/logger.js";
import type { Config } from "@/config.js";
import { generateObject, generateText } from "ai";
import { createLlmProvider } from "@/agent/llm/provider.js";
import { z } from "zod";

export async function executeWorkflow(
    workflowType: string,
    params: Record<string, unknown>,
    config: Config,
): Promise<unknown> {
    logger.info("Executing workflow", { workflowType, params });

    switch (workflowType) {
        case "route-query":
            return await routeUserQuery(params.query as string, config);
        default:
            throw new Error(`Unknown workflow type: ${workflowType}`);
    }
}

export async function routeUserQuery(query: string, config: Config) {
    const modelConfig = config.models.find((m) => m.name === config.defaultModel);
    if (!modelConfig) {
        throw new Error(`Model configuration not found for: ${config.defaultModel}`);
    }

    const model = createLlmProvider(modelConfig, config);

    const classificationSchema = z.object({
        reasoning: z.string(),
        type: z.enum(["general", "code", "debug", "explain"]),
        complexity: z.enum(["simple", "moderate", "complex"]),
        requiresTools: z.boolean(),
    });

    const { object: classification } = await generateObject({
        model,
        schema: classificationSchema,
        prompt: `Analyze this query and classify it: ${query}`,
    });

    const { text: response } = await generateText({
        model,
        system: "You are a helpful coding assistant.",
        prompt: query,
    });

    return {
        classification,
        response,
    };
}
