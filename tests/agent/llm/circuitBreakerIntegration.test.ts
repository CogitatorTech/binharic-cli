import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    CircuitBreakerState,
    getCircuitBreaker,
    resetAllCircuitBreakers,
} from "@/agent/core/circuitBreaker.js";

describe("Circuit Breaker - LLM Provider Integration", () => {
    beforeEach(() => {
        resetAllCircuitBreakers();
    });

    it("should protect LLM provider calls with circuit breaker", async () => {
        const breaker = getCircuitBreaker("llm-openai", {
            failureThreshold: 3,
            successThreshold: 2,
            timeout: 5000,
            resetTimeout: 1000,
        });

        const mockLLMCall = vi.fn().mockRejectedValue(new Error("API Error 500"));

        for (let i = 0; i < 3; i++) {
            try {
                await breaker.execute(mockLLMCall);
            } catch (error) {}
        }

        expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
        expect(mockLLMCall).toHaveBeenCalledTimes(3);

        await expect(breaker.execute(mockLLMCall)).rejects.toThrow("Circuit breaker is OPEN");
        expect(mockLLMCall).toHaveBeenCalledTimes(3);
    });

    it("should allow recovery after provider becomes available", async () => {
        const breaker = getCircuitBreaker("llm-anthropic", {
            failureThreshold: 2,
            successThreshold: 2,
            timeout: 5000,
            resetTimeout: 100,
        });

        const mockLLMCall = vi
            .fn()
            .mockRejectedValueOnce(new Error("503 Service Unavailable"))
            .mockRejectedValueOnce(new Error("503 Service Unavailable"))
            .mockResolvedValue({ response: "Success" });

        for (let i = 0; i < 2; i++) {
            try {
                await breaker.execute(mockLLMCall);
            } catch (error) {}
        }

        expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

        await new Promise((resolve) => setTimeout(resolve, 150));

        const result1 = await breaker.execute(mockLLMCall);
        expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);

        const result2 = await breaker.execute(mockLLMCall);
        expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
        expect(result2).toEqual({ response: "Success" });
    });

    it("should handle rate limit errors appropriately", async () => {
        const breaker = getCircuitBreaker("llm-google", {
            failureThreshold: 3,
            successThreshold: 2,
            timeout: 5000,
            resetTimeout: 2000,
        });

        const rateLimitError = new Error("Rate limit exceeded");
        (rateLimitError as any).status = 429;

        const mockLLMCall = vi.fn().mockRejectedValue(rateLimitError);

        for (let i = 0; i < 3; i++) {
            try {
                await breaker.execute(mockLLMCall);
            } catch (error) {}
        }

        expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

        const stats = breaker.getStats();
        expect(stats.failureCount).toBe(3);
    });

    it("should provide separate circuit breakers for different providers", async () => {
        const openaiBreaker = getCircuitBreaker("llm-openai");
        const anthropicBreaker = getCircuitBreaker("llm-anthropic");

        expect(openaiBreaker).not.toBe(anthropicBreaker);

        const mockFailure = vi.fn().mockRejectedValue(new Error("Error"));

        for (let i = 0; i < 5; i++) {
            try {
                await openaiBreaker.execute(mockFailure);
            } catch (error) {}
        }

        expect(openaiBreaker.getState()).toBe(CircuitBreakerState.OPEN);
        expect(anthropicBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it("should handle timeouts from slow LLM responses", async () => {
        const breaker = getCircuitBreaker("llm-slow", {
            failureThreshold: 2,
            successThreshold: 2,
            timeout: 100,
            resetTimeout: 1000,
        });

        const slowLLMCall = vi
            .fn()
            .mockImplementation(
                () => new Promise((resolve) => setTimeout(() => resolve("response"), 200)),
            );

        for (let i = 0; i < 2; i++) {
            try {
                await breaker.execute(slowLLMCall);
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain("timeout");
            }
        }

        expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
    });

    it("should track statistics for monitoring", async () => {
        const breaker = getCircuitBreaker("llm-monitored", {
            failureThreshold: 5,
            successThreshold: 2,
            timeout: 5000,
            resetTimeout: 1000,
        });

        const mockLLMCall = vi
            .fn()
            .mockRejectedValueOnce(new Error("Error 1"))
            .mockRejectedValueOnce(new Error("Error 2"))
            .mockResolvedValueOnce("Success 1")
            .mockResolvedValueOnce("Success 2");

        try {
            await breaker.execute(mockLLMCall);
        } catch (error) {}
        try {
            await breaker.execute(mockLLMCall);
        } catch (error) {}

        await breaker.execute(mockLLMCall);
        await breaker.execute(mockLLMCall);

        const stats = breaker.getStats();
        expect(stats.state).toBe(CircuitBreakerState.CLOSED);
        expect(stats.failureCount).toBe(0);
    });

    it("should prevent cascading failures across multiple API calls", async () => {
        const breaker = getCircuitBreaker("llm-cascade", {
            failureThreshold: 3,
            successThreshold: 2,
            timeout: 5000,
            resetTimeout: 500,
        });

        let apiCallCount = 0;
        const cascadingFailure = vi.fn().mockImplementation(() => {
            apiCallCount++;
            return Promise.reject(new Error("Service degraded"));
        });

        for (let i = 0; i < 3; i++) {
            try {
                await breaker.execute(cascadingFailure);
            } catch (error) {}
        }

        for (let i = 0; i < 10; i++) {
            try {
                await breaker.execute(cascadingFailure);
            } catch (error) {}
        }

        expect(apiCallCount).toBe(3);
        expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
    });
});
