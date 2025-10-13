import { tools } from "./definitions/index.js";
import type { Config } from "@/config.js";

export { tools };

export async function runTool(
    { toolName, args }: { toolName: string; args: Record<string, unknown> },
    config: Config,
): Promise<unknown> {
    const tool = tools[toolName as keyof typeof tools];
    if (!tool) {
        throw new Error(`Tool "${toolName}" not found`);
    }

    if (!tool.execute) {
        throw new Error(`Tool "${toolName}" does not have an execute function`);
    }

    return tool.execute(
        args as never,
        {
            experimental_context: config,
            toolCallId: "manual-call",
            messages: [],
        } as never,
    );
}
