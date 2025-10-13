import { describe, expect, it, vi, beforeEach } from "vitest";
import fetchTool from "../../../../src/agent/tools/definitions/fetch";
import { ToolError } from "../../../../src/agent/errors";

global.fetch = vi.fn();

vi.mock("html-to-text", async (importOriginal) => {
    const actual = await importOriginal<typeof import("html-to-text")>();
    return {
        ...actual,
        compile: vi.fn(() => vi.fn((html: string) => html.replace(/<[^>]*>/g, ""))),
    };
});

describe("fetch tool", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it("should fetch a URL and return plain text by default", async () => {
        const mockFetch = vi.mocked(global.fetch);
        const { compile } = await import("html-to-text");

        mockFetch.mockResolvedValue({
            ok: true,
            text: async () => "<html><body>Hello</body></html>",
        } as Response);

        const mockConverter = vi.fn(() => "Hello");
        vi.mocked(compile).mockReturnValue(mockConverter as any);

        const result = await fetchTool.execute!({ url: "https://example.com" }, {} as any);

        expect(result).toBe("Hello");
        expect(mockFetch).toHaveBeenCalledWith("https://example.com");
    });

    it("should return raw HTML when stripMarkup is false", async () => {
        const mockFetch = vi.mocked(global.fetch);

        mockFetch.mockResolvedValue({
            ok: true,
            text: async () => "<html><body>Hello</body></html>",
        } as Response);

        const result = await fetchTool.execute!(
            { url: "https://example.com", stripMarkup: false },
            {} as any,
        );

        expect(result).toBe("<html><body>Hello</body></html>");
    });

    it("should throw a ToolError for non-ok responses", async () => {
        const mockFetch = vi.mocked(global.fetch);

        mockFetch.mockResolvedValue({
            ok: false,
            status: 404,
            text: async () => "Not Found",
        } as Response);

        await expect(fetchTool.execute!({ url: "https://example.com" }, {} as any)).rejects.toThrow(
            "Request failed with status 404",
        );
    });

    it("should throw a ToolError for network errors", async () => {
        const mockFetch = vi.mocked(global.fetch);

        mockFetch.mockRejectedValue(new Error("Network error"));

        await expect(fetchTool.execute!({ url: "https://example.com" }, {} as any)).rejects.toThrow(
            "Network error",
        );
    });

    it("should throw a ToolError for unknown errors", async () => {
        const mockFetch = vi.mocked(global.fetch);

        mockFetch.mockRejectedValue("unknown error");

        await expect(fetchTool.execute!({ url: "https://example.com" }, {} as any)).rejects.toThrow(
            "An unknown error occurred during fetch.",
        );
    });
});
