import { describe, expect, it, vi, beforeEach } from "vitest";
import mcpTool from "../../../../src/agent/tools/definitions/mcp";
import { ToolError } from "../../../../src/agent/errors";
import type { Config } from "../../../../src/config";

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
    Client: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
    StdioClientTransport: vi.fn(),
}));

describe("mcp tool", () => {
    let mockClientInstance: any;
    let mockClose: any;
    let mockConfig: Config;

    beforeEach(async () => {
        vi.clearAllMocks();

        const { Client } = vi.mocked(await import("@modelcontextprotocol/sdk/client/index.js"));
        const { StdioClientTransport } = vi.mocked(
            await import("@modelcontextprotocol/sdk/client/stdio.js"),
        );

        mockClose = vi.fn();
        vi.mocked(StdioClientTransport).mockReturnValue({
            close: mockClose,
        } as any);

        mockClientInstance = {
            connect: vi.fn(),
            callTool: vi.fn(),
        };

        vi.mocked(Client).mockImplementation(() => mockClientInstance);

        mockConfig = {
            userName: "testuser",
            systemPrompt: "test",
            defaultModel: "test-model",
            models: [],
            history: { maxItems: null },
            mcpServers: {
                testServer: {
                    command: "node",
                    args: ["server.js"],
                },
            },
        };
    });

    it("should call an MCP tool and return the text content", async () => {
        mockClientInstance.connect.mockResolvedValue(undefined);
        mockClientInstance.callTool.mockResolvedValue({
            content: [{ type: "text", text: "Tool result" }],
        });

        const result = await mcpTool.execute!(
            {
                server: "testServer",
                tool: "testTool",
                arguments: { key: "value" },
            },
            { experimental_context: mockConfig } as any,
        );

        expect(result).toBe("Tool result");
        expect(mockClientInstance.connect).toHaveBeenCalled();
        expect(mockClientInstance.callTool).toHaveBeenCalledWith({
            name: "testTool",
            arguments: { key: "value" },
        });
        expect(mockClose).toHaveBeenCalled();
    });

    it("should return an empty string if the tool returns no text content", async () => {
        mockClientInstance.connect.mockResolvedValue(undefined);
        mockClientInstance.callTool.mockResolvedValue({
            content: [{ type: "image", data: "base64data" }],
        });

        const result = await mcpTool.execute!({ server: "testServer", tool: "testTool" }, {
            experimental_context: mockConfig,
        } as any);

        expect(result).toBe("");
    });

    it("should throw a ToolError if config is missing", async () => {
        await expect(
            mcpTool.execute!({ server: "testServer", tool: "testTool" }, {} as any),
        ).rejects.toThrow("MCP tool requires a configuration object.");
    });

    it("should throw a ToolError if server config is missing", async () => {
        await expect(
            mcpTool.execute!({ server: "nonexistent", tool: "testTool" }, {
                experimental_context: mockConfig,
            } as any),
        ).rejects.toThrow('MCP server "nonexistent" not found in configuration.');
    });

    it("should throw a ToolError on client connection failure", async () => {
        mockClientInstance.connect.mockRejectedValue(new Error("Connection failed"));

        await expect(
            mcpTool.execute!({ server: "testServer", tool: "testTool" }, {
                experimental_context: mockConfig,
            } as any),
        ).rejects.toThrow("MCP error: Connection failed");
    });

    it("should handle unknown errors gracefully", async () => {
        mockClientInstance.connect.mockResolvedValue(undefined);
        mockClientInstance.callTool.mockRejectedValue("Unknown error");

        await expect(
            mcpTool.execute!({ server: "testServer", tool: "testTool" }, {
                experimental_context: mockConfig,
            } as any),
        ).rejects.toThrow("An unknown error occurred with MCP tool.");
    });
});
