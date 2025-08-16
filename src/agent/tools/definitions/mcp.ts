// src/agent/tools/definitions/mcp.ts
import { z } from "zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { ToolDef } from "../common.js";
// FIX: Import ToolError from the correct module.
import { ToolError } from "../../errors.js";
import type { Config } from "@/config";

// This type is a simplified version for what we expect from an MCP tool call result
type MCPResult = {
    content: Array<{ type: "text"; text: string } | { type: string; [key: string]: unknown }>;
};

const mcpSchema = z.object({
    name: z.literal("mcp"),
    arguments: z
        .object({
            server: z
                .string()
                .describe("Name of the MCP server to use (must be configured by the user)."),
            tool: z.string().describe("Name of the tool to call on the MCP server."),
            arguments: z
                .record(z.string(), z.unknown())
                .optional()
                .describe("Arguments for the MCP tool."),
        })
        .strict(),
});

async function implementation(
    args: z.infer<typeof mcpSchema>["arguments"],
    config?: Config,
): Promise<string> {
    if (!config) {
        throw new ToolError("MCP tool requires a configuration object.");
    }
    const serverConfig = config.mcpServers?.[args.server];
    if (!serverConfig) {
        throw new ToolError(`MCP server "${args.server}" not found in configuration.`);
    }

    const client = new Client({ name: `tobi-${args.server}`, version: "0.1.0" });
    const transport = new StdioClientTransport({
        command: serverConfig.command,
        args: serverConfig.args || [],
        stderr: "ignore",
    });

    try {
        await client.connect(transport);
        const result = (await client.callTool({
            name: args.tool,
            arguments: args.arguments || {},
        })) as MCPResult;

        return result.content
            .filter((item): item is { type: "text"; text: string } => item.type === "text")
            .map((item) => item.text)
            .join("\n");
    } catch (error) {
        if (error instanceof Error) {
            throw new ToolError(`MCP error: ${error.message}`);
        }
        throw new ToolError("An unknown error occurred with MCP tool.");
    } finally {
        await transport.close();
    }
}

export default {
    schema: mcpSchema,
    implementation,
    description: "Call a tool on an MCP server.",
} satisfies ToolDef<typeof mcpSchema>;
