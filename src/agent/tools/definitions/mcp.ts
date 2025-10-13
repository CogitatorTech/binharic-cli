import { z } from "zod";
import { tool } from "ai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ToolError } from "../../errors.js";
import type { Config } from "@/config";

type MCPResult = {
    content: Array<{ type: "text"; text: string } | { type: string; [key: string]: unknown }>;
};

export const mcpTool = tool({
    description: "Call a tool on an MCP (Model Context Protocol) server.",
    inputSchema: z
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
    execute: async ({ server, tool: toolName, arguments: toolArgs }, { experimental_context }) => {
        const config = experimental_context as Config | undefined;

        if (!config) {
            throw new ToolError("MCP tool requires a configuration object.");
        }
        const serverConfig = config.mcpServers?.[server];
        if (!serverConfig) {
            throw new ToolError(`MCP server "${server}" not found in configuration.`);
        }

        const client = new Client({ name: `binharic-${server}`, version: "0.1.0" });
        const transport = new StdioClientTransport({
            command: serverConfig.command,
            args: serverConfig.args || [],
            stderr: "ignore",
        });

        try {
            await client.connect(transport);
            const result = (await client.callTool({
                name: toolName,
                arguments: toolArgs || {},
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
    },
});

export default mcpTool;
