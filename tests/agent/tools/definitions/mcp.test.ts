import { beforeEach, describe, expect, it, vi } from "vitest";
import mcpTool from "../../../../src/agent/tools/definitions/mcp";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Config } from "../../../../src/config";

vi.mock("@modelcontextprotocol/sdk/client/index.js");
vi.mock("@modelcontextprotocol/sdk/client/stdio.js");

describe("mcp tool", () => {
    const mockClient = vi.mocked(Client);
    const mockTransport = vi.mocked(StdioClientTransport);

    let mockConnect: vi.Mock;
    let mockCallTool: vi.Mock;
    let mockClose: vi.Mock;

    beforeEach(() => {
        vi.resetAllMocks();

        mockConnect = vi.fn().mockResolvedValue(undefined);
        mockCallTool = vi.fn();
        mockClose = vi.fn().mockResolvedValue(undefined);

        // Mock the constructor and methods
        mockClient.mockImplementation(
            () =>
                ({
                    connect: mockConnect,
                    callTool: mockCallTool,
                }) as unknown as Client,
        );
        mockTransport.mockImplementation(
            () =>
                ({
                    close: mockClose,
                }) as unknown as StdioClientTransport,
        );
    });

    const mockConfig = {
        mcpServers: {
            testServer: {
                command: "test-command",
            },
        },
    } as unknown as Config;

    it("should call an MCP tool and return the text content", async () => {
        mockCallTool.mockResolvedValue({
            content: [{ type: "text", text: "Success!" }],
        });

        const { implementation } = mcpTool;
        const result = await implementation(
            {
                server: "testServer",
                tool: "testTool",
                arguments: { arg1: "value1" },
            },
            mockConfig,
        );

        expect(result).toBe("Success!");
        expect(mockClient).toHaveBeenCalledWith({ name: "tobi-testServer", version: "0.1.0" });
        expect(mockTransport).toHaveBeenCalledWith({
            command: "test-command",
            args: [],
            stderr: "ignore",
        });
        expect(mockConnect).toHaveBeenCalled();
        expect(mockCallTool).toHaveBeenCalledWith({
            name: "testTool",
            arguments: { arg1: "value1" },
        });
        expect(mockClose).toHaveBeenCalled();
    });

    it("should return an empty string if the tool returns no text content", async () => {
        mockCallTool.mockResolvedValue({
            content: [{ type: "other", data: "some data" }],
        });

        const { implementation } = mcpTool;
        const result = await implementation({ server: "testServer", tool: "testTool" }, mockConfig);

        expect(result).toBe("");
    });

    it("should throw a ToolError if config is missing", async () => {
        const { implementation } = mcpTool;
        await expect(implementation({ server: "testServer", tool: "testTool" })).rejects.toThrow(
            "MCP tool requires a configuration object.",
        );
    });

    it("should throw a ToolError if server config is missing", async () => {
        const { implementation } = mcpTool;
        await expect(
            implementation({ server: "nonexistent", tool: "testTool" }, mockConfig),
        ).rejects.toThrow('MCP server "nonexistent" not found in configuration.');
    });

    it("should throw a ToolError if client.connect fails", async () => {
        mockConnect.mockRejectedValue(new Error("Connection failed"));
        const { implementation } = mcpTool;

        await expect(
            implementation({ server: "testServer", tool: "testTool" }, mockConfig),
        ).rejects.toThrow("MCP error: Connection failed");
        expect(mockClose).toHaveBeenCalled(); // Ensure finally block runs
    });

    it("should throw a ToolError if client.callTool fails", async () => {
        mockCallTool.mockRejectedValue(new Error("Tool call failed"));
        const { implementation } = mcpTool;

        await expect(
            implementation({ server: "testServer", tool: "testTool" }, mockConfig),
        ).rejects.toThrow("MCP error: Tool call failed");
        expect(mockClose).toHaveBeenCalled();
    });

    it("should still attempt to close transport if callTool fails with non-Error", async () => {
        mockCallTool.mockRejectedValue("a string error");
        const { implementation } = mcpTool;

        await expect(
            implementation({ server: "testServer", tool: "testTool" }, mockConfig),
        ).rejects.toThrow("An unknown error occurred with MCP tool.");
        expect(mockClose).toHaveBeenCalled();
    });

    it("should pass server args to the transport", async () => {
        mockCallTool.mockResolvedValue({
            content: [],
        });
        const configWithArgs = {
            mcpServers: {
                testServer: {
                    command: "test-command",
                    args: ["--arg1", "--arg2"],
                },
            },
        } as unknown as Config;

        const { implementation } = mcpTool;
        await implementation({ server: "testServer", tool: "testTool" }, configWithArgs);

        expect(mockTransport).toHaveBeenCalledWith({
            command: "test-command",
            args: ["--arg1", "--arg2"],
            stderr: "ignore",
        });
    });
});
