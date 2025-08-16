import { describe, expect, it, vi } from "vitest";
import fetchTool from "../../../../src/agent/tools/definitions/fetch";
import { z } from "zod";

global.fetch = vi.fn();

function callImplementation(args: z.input<typeof fetchTool.schema.shape.arguments>) {
    const { implementation, schema } = fetchTool;
    const parsedArgs = schema.shape.arguments.parse(args);
    return implementation(parsedArgs);
}

describe("fetch tool", () => {
    it("should fetch a URL and return plain text by default", async () => {
        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValue({
            ok: true,
            text: async () => "<h1>Hello</h1>",
        } as Response);

        const result = await callImplementation({ url: "https://example.com" });

        expect(result).toBe("HELLO");
        expect(mockFetch).toHaveBeenCalledWith("https://example.com");
    });

    it("should return raw HTML when stripMarkup is false", async () => {
        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValue({
            ok: true,
            text: async () => "<h1>Hello</h1>",
        } as Response);

        const result = await callImplementation({
            url: "https://example.com",
            stripMarkup: false,
        });

        expect(result).toBe("<h1>Hello</h1>");
    });

    it("should throw a ToolError for non-ok responses", async () => {
        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValue({
            ok: false,
            status: 404,
            text: async () => "Not Found",
        } as Response);

        await expect(callImplementation({ url: "https://example.com" })).rejects.toThrow(
            "Request failed with status 404: Not Found",
        );
    });

    it("should throw a ToolError for network errors", async () => {
        const mockFetch = vi.mocked(fetch);
        mockFetch.mockRejectedValue(new Error("Network error"));

        await expect(callImplementation({ url: "https://example.com" })).rejects.toThrow(
            "Network error",
        );
    });

    it("should throw a ToolError for unknown errors", async () => {
        const mockFetch = vi.mocked(fetch);
        mockFetch.mockRejectedValue("an unknown error");

        await expect(callImplementation({ url: "https://example.com" })).rejects.toThrow(
            "An unknown error occurred during fetch.",
        );
    });
});
