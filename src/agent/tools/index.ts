// src/agent/tools/index.ts
// CORRECTED: This file now compiles correctly due to the fix in autofix.ts.

import { z } from "zod";
import { toolModules, toolSchemas } from "./definitions/index.js";
import type { ToolCall } from "../types.js";
import { ToolError } from "../errors.js";
import type { Config } from "@/config";
import logger from "@/logger.js";
import { autofixJson } from "../autofix.js";

export { toolSchemas };

const toolImplementations = Object.fromEntries(
    Object.values(toolModules).map((module) => [
        module.schema.shape.name.value,
        module.implementation,
    ]),
) as Record<ToolCall["toolName"], (args: unknown, config: Config) => Promise<unknown>>;

export async function runTool(
    toolCall: { toolName: string; args: unknown },
    config: Config,
): Promise<unknown> {
    const toolName = toolCall.toolName as keyof typeof toolModules;
    logger.info(`Running tool: ${toolName}`);
    logger.debug({ args: toolCall.args });

    const implementation = toolImplementations[toolName];
    const toolDef = toolModules[toolName];

    if (!implementation || !toolDef) {
        throw new ToolError(`Unknown tool "${toolName}"`);
    }

    try {
        const validatedArgs = toolDef.schema.shape.arguments.parse(toolCall.args);
        return await implementation(validatedArgs, config);
    } catch (error) {
        if (error instanceof z.ZodError && typeof toolCall.args === "string") {
            logger.warn("Tool args failed validation, attempting autofix...");
            const fixedArgs = await autofixJson(toolDef.schema.shape.arguments, toolCall.args);
            if (fixedArgs) {
                logger.info("Autofix successful, rerunning tool with corrected args.");
                return await implementation(fixedArgs, config);
            }
        }
        logger.error(`Error running tool ${toolName}:`, error);
        if (error instanceof ToolError) throw error;
        throw new ToolError(
            `Invalid arguments for tool ${toolName}: ${error instanceof z.ZodError ? error.message : "Unknown validation error"}`,
        );
    }
}
