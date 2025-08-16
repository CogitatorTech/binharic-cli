import { describe, expect, it } from "vitest";
import { createStatusMessage } from "../../src/frontend/utility.js";

describe("createStatusMessage", () => {
    it("should return a formatted message for a valid response", () => {
        const mockResponse = { status: "ok" };
        const message = createStatusMessage(mockResponse);
        expect(message).toBe("Server status is currently: OK");
    });

    it("should handle different statuses", () => {
        const mockResponse = { status: "error" };
        const message = createStatusMessage(mockResponse);
        expect(message).toBe("Server status is currently: ERROR");
    });

    it("should return an invalid data message for missing status property", () => {
        const mockResponse = { data: "some data" };
        const message = createStatusMessage(mockResponse);
        expect(message).toBe("Invalid data");
    });

    it("should return an invalid data message for null or undefined input", () => {
        expect(createStatusMessage(null)).toBe("Invalid data");
        expect(createStatusMessage(undefined)).toBe("Invalid data");
    });
});
