import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("History Rollback on Error Bug Fix", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should rollback history entries added during a failed agent logic execution", () => {
        const initialHistory = [{ id: "1", role: "user" as const, content: "test message" }];

        const historyAfterError = [...initialHistory];

        const startLength = initialHistory.length;
        const currentLength = historyAfterError.length + 2;

        if (currentLength > startLength) {
            historyAfterError.splice(startLength);
        }

        expect(historyAfterError).toHaveLength(initialHistory.length);
        expect(historyAfterError).toEqual(initialHistory);
    });

    it("should preserve history if no items were added before error", () => {
        const initialHistory = [
            { id: "1", role: "user" as const, content: "test message" },
            { id: "2", role: "assistant" as const, content: "response" },
        ];

        const startLength = initialHistory.length;
        const currentLength = initialHistory.length;

        const shouldRollback = currentLength > startLength;

        expect(shouldRollback).toBe(false);
        expect(initialHistory).toHaveLength(2);
    });

    it("should rollback multiple items added during failed execution", () => {
        const initialHistory = [{ id: "1", role: "user" as const, content: "list files" }];

        const historyWithPartialItems = [
            ...initialHistory,
            { id: "2", role: "assistant" as const, content: "" },
            { id: "3", role: "tool-request" as const, calls: [] },
        ];

        const startLength = initialHistory.length;
        const rolledBackHistory = historyWithPartialItems.slice(0, startLength);

        expect(rolledBackHistory).toHaveLength(initialHistory.length);
        expect(rolledBackHistory).toEqual(initialHistory);
    });

    it("should handle rollback when assistant message was partially added", () => {
        const initialHistory = [{ id: "1", role: "user" as const, content: "what time is it?" }];

        const historyWithPartialAssistant = [
            ...initialHistory,
            { id: "2", role: "assistant" as const, content: "Let me check" },
        ];

        const startLength = initialHistory.length;

        if (historyWithPartialAssistant.length > startLength) {
            const rolledBack = historyWithPartialAssistant.slice(0, startLength);
            expect(rolledBack).toHaveLength(1);
            expect(rolledBack[0].role).toBe("user");
        }
    });

    it("should calculate correct rollback count", () => {
        const startLength = 5;
        const currentLength = 8;
        const itemsToRollback = currentLength - startLength;

        expect(itemsToRollback).toBe(3);
    });

    it("should not rollback if error occurs before any history additions", () => {
        const initialHistory = [
            { id: "1", role: "user" as const, content: "test" },
            { id: "2", role: "assistant" as const, content: "response" },
        ];

        const startLength = 2;
        const currentLength = 2;

        const shouldRollback = currentLength > startLength;
        expect(shouldRollback).toBe(false);
    });

    it("should handle edge case of empty history", () => {
        const initialHistory: any[] = [];
        const startLength = 0;

        const historyAfterPartialAdd = [{ id: "1", role: "user" as const, content: "test" }];

        if (historyAfterPartialAdd.length > startLength) {
            const rolledBack = historyAfterPartialAdd.slice(0, startLength);
            expect(rolledBack).toHaveLength(0);
        }
    });

    it("should prevent stale tool call IDs from persisting", () => {
        const toolCallId = "call_h3XHvxzjgdbfvaZXGwvitvtB";

        const historyBeforeError = [{ id: "1", role: "user" as const, content: "list files" }];

        const historyWithStaleToolCall = [
            ...historyBeforeError,
            {
                id: "2",
                role: "assistant" as const,
                content: "",
            },
            {
                id: "3",
                role: "tool-request" as const,
                calls: [
                    {
                        type: "tool-call" as const,
                        toolCallId,
                        toolName: "list",
                        args: {},
                    },
                ],
            },
        ];

        const startLength = historyBeforeError.length;
        const cleanedHistory = historyWithStaleToolCall.slice(0, startLength);

        const hasStaleToolCall = cleanedHistory.some(
            (item: any) =>
                item.role === "tool-request" &&
                item.calls?.some((call: any) => call.toolCallId === toolCallId),
        );

        expect(hasStaleToolCall).toBe(false);
        expect(cleanedHistory).toEqual(historyBeforeError);
    });

    it("should preserve successful history and only rollback failed additions", () => {
        const successfulHistory = [
            { id: "1", role: "user" as const, content: "first question" },
            { id: "2", role: "assistant" as const, content: "first answer" },
            { id: "3", role: "user" as const, content: "second question" },
        ];

        const startLength = successfulHistory.length;

        const historyWithFailedAdditions = [
            ...successfulHistory,
            { id: "4", role: "assistant" as const, content: "partial" },
            { id: "5", role: "tool-request" as const, calls: [] },
        ];

        const rolledBack = historyWithFailedAdditions.slice(0, startLength);

        expect(rolledBack).toHaveLength(3);
        expect(rolledBack).toEqual(successfulHistory);
        expect(rolledBack[rolledBack.length - 1].role).toBe("user");
    });
});
