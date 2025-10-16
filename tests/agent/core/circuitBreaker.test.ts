import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    CircuitBreaker,
    CircuitBreakerState,
    getCircuitBreaker,
    resetAllCircuitBreakers,
} from "@/agent/core/circuitBreaker.js";

describe("Circuit Breaker Pattern", () => {
    beforeEach(() => {
        resetAllCircuitBreakers();
    });

    describe("Basic Functionality", () => {
        it("should start in CLOSED state", () => {
            const breaker = new CircuitBreaker("test", {
                failureThreshold: 3,
                successThreshold: 2,
                timeout: 5000,
                resetTimeout: 5000,
            });

            expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
        });

        it("should allow requests to pass through when CLOSED", async () => {
            const breaker = new CircuitBreaker("test", {
                failureThreshold: 3,
                successThreshold: 2,
                timeout: 5000,
                resetTimeout: 5000,
            });

            const mockFn = vi.fn().mockResolvedValue("success");
            const result = await breaker.execute(mockFn);

            expect(result).toBe("success");
            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        it("should transition to OPEN after failure threshold is reached", async () => {
            const breaker = new CircuitBreaker("test", {
                failureThreshold: 3,
                successThreshold: 2,
                timeout: 5000,
                resetTimeout: 5000,
            });

            const mockFn = vi.fn().mockRejectedValue(new Error("Service unavailable"));

            for (let i = 0; i < 3; i++) {
                try {
                    await breaker.execute(mockFn);
                } catch (error) {}
            }

            expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
        });

        it("should reject requests immediately when OPEN", async () => {
            const breaker = new CircuitBreaker("test", {
                failureThreshold: 3,
                successThreshold: 2,
                timeout: 5000,
                resetTimeout: 1000,
            });

            const mockFn = vi.fn().mockRejectedValue(new Error("Service error"));

            for (let i = 0; i < 3; i++) {
                try {
                    await breaker.execute(mockFn);
                } catch (error) {}
            }

            const stats = breaker.getStats();
            expect(stats.state).toBe(CircuitBreakerState.OPEN);

            await expect(breaker.execute(mockFn)).rejects.toThrow("Circuit breaker is OPEN");
        });
    });

    describe("State Transitions", () => {
        it("should transition from OPEN to HALF_OPEN after reset timeout", async () => {
            const breaker = new CircuitBreaker("test", {
                failureThreshold: 2,
                successThreshold: 2,
                timeout: 5000,
                resetTimeout: 100,
            });

            const mockFn = vi.fn().mockRejectedValue(new Error("Error"));

            for (let i = 0; i < 2; i++) {
                try {
                    await breaker.execute(mockFn);
                } catch (error) {}
            }

            expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

            await new Promise((resolve) => setTimeout(resolve, 150));

            mockFn.mockResolvedValue("success");
            await breaker.execute(mockFn);

            expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);
        });

        it("should transition from HALF_OPEN to CLOSED after success threshold", async () => {
            const breaker = new CircuitBreaker("test", {
                failureThreshold: 2,
                successThreshold: 2,
                timeout: 5000,
                resetTimeout: 100,
            });

            const mockFn = vi.fn().mockRejectedValue(new Error("Error"));

            for (let i = 0; i < 2; i++) {
                try {
                    await breaker.execute(mockFn);
                } catch (error) {}
            }

            await new Promise((resolve) => setTimeout(resolve, 150));

            mockFn.mockResolvedValue("success");
            await breaker.execute(mockFn);
            expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);

            await breaker.execute(mockFn);
            expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
        });

        it("should transition from HALF_OPEN back to OPEN on failure", async () => {
            const breaker = new CircuitBreaker("test", {
                failureThreshold: 2,
                successThreshold: 2,
                timeout: 5000,
                resetTimeout: 100,
            });

            const mockFn = vi.fn().mockRejectedValue(new Error("Error"));

            for (let i = 0; i < 2; i++) {
                try {
                    await breaker.execute(mockFn);
                } catch (error) {}
            }

            await new Promise((resolve) => setTimeout(resolve, 150));

            try {
                await breaker.execute(mockFn);
            } catch (error) {}

            expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
        });
    });

    describe("Timeout Handling", () => {
        it("should timeout long-running operations", async () => {
            const breaker = new CircuitBreaker("test", {
                failureThreshold: 3,
                successThreshold: 2,
                timeout: 100,
                resetTimeout: 5000,
            });

            const slowFn = vi
                .fn()
                .mockImplementation(
                    () => new Promise((resolve) => setTimeout(() => resolve("done"), 200)),
                );

            await expect(breaker.execute(slowFn)).rejects.toThrow("Circuit breaker timeout");
        });

        it("should count timeouts as failures", async () => {
            const breaker = new CircuitBreaker("test", {
                failureThreshold: 2,
                successThreshold: 2,
                timeout: 50,
                resetTimeout: 5000,
            });

            const slowFn = vi
                .fn()
                .mockImplementation(
                    () => new Promise((resolve) => setTimeout(() => resolve("done"), 100)),
                );

            for (let i = 0; i < 2; i++) {
                try {
                    await breaker.execute(slowFn);
                } catch (error) {}
            }

            expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
        });
    });

    describe("Statistics and Monitoring", () => {
        it("should track failure count", async () => {
            const breaker = new CircuitBreaker("test", {
                failureThreshold: 5,
                successThreshold: 2,
                timeout: 5000,
                resetTimeout: 5000,
            });

            const mockFn = vi.fn().mockRejectedValue(new Error("Error"));

            for (let i = 0; i < 3; i++) {
                try {
                    await breaker.execute(mockFn);
                } catch (error) {}
            }

            const stats = breaker.getStats();
            expect(stats.failureCount).toBe(3);
        });

        it("should reset failure count on success", async () => {
            const breaker = new CircuitBreaker("test", {
                failureThreshold: 5,
                successThreshold: 2,
                timeout: 5000,
                resetTimeout: 5000,
            });

            const mockFn = vi
                .fn()
                .mockRejectedValueOnce(new Error("Error"))
                .mockRejectedValueOnce(new Error("Error"))
                .mockResolvedValue("success");

            try {
                await breaker.execute(mockFn);
            } catch (error) {}
            try {
                await breaker.execute(mockFn);
            } catch (error) {}

            await breaker.execute(mockFn);

            const stats = breaker.getStats();
            expect(stats.failureCount).toBe(0);
        });

        it("should track last failure time", async () => {
            const breaker = new CircuitBreaker("test", {
                failureThreshold: 5,
                successThreshold: 2,
                timeout: 5000,
                resetTimeout: 5000,
            });

            const beforeTime = Date.now();
            const mockFn = vi.fn().mockRejectedValue(new Error("Error"));

            try {
                await breaker.execute(mockFn);
            } catch (error) {}

            const stats = breaker.getStats();
            expect(stats.lastFailureTime).toBeGreaterThanOrEqual(beforeTime);
        });
    });

    describe("Global Circuit Breaker Management", () => {
        it("should create and retrieve circuit breakers by name", () => {
            const breaker1 = getCircuitBreaker("service-1");
            const breaker2 = getCircuitBreaker("service-1");

            expect(breaker1).toBe(breaker2);
        });

        it("should create different breakers for different names", () => {
            const breaker1 = getCircuitBreaker("service-1");
            const breaker2 = getCircuitBreaker("service-2");

            expect(breaker1).not.toBe(breaker2);
        });

        it("should apply custom config when creating breaker", async () => {
            const breaker = getCircuitBreaker("custom", {
                failureThreshold: 10,
                successThreshold: 5,
            });

            const mockFn = vi.fn().mockRejectedValue(new Error("Error"));

            for (let i = 0; i < 9; i++) {
                try {
                    await breaker.execute(mockFn);
                } catch (error) {}
            }

            expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
        });

        it("should reset all circuit breakers", async () => {
            const breaker1 = getCircuitBreaker("test-1");
            const breaker2 = getCircuitBreaker("test-2");

            const mockFn = vi.fn().mockRejectedValue(new Error("Error"));

            for (let i = 0; i < 5; i++) {
                try {
                    await breaker1.execute(mockFn);
                } catch (error) {}
                try {
                    await breaker2.execute(mockFn);
                } catch (error) {}
            }

            resetAllCircuitBreakers();

            expect(breaker1.getState()).toBe(CircuitBreakerState.CLOSED);
            expect(breaker2.getState()).toBe(CircuitBreakerState.CLOSED);
        });
    });

    describe("Real-world Scenarios", () => {
        it("should handle intermittent failures gracefully", async () => {
            const breaker = new CircuitBreaker("test", {
                failureThreshold: 3,
                successThreshold: 2,
                timeout: 5000,
                resetTimeout: 100,
            });

            let callCount = 0;
            const intermittentFn = vi.fn().mockImplementation(() => {
                callCount++;
                if (callCount <= 3) {
                    return Promise.reject(new Error("Temporary failure"));
                }
                return Promise.resolve("success");
            });

            for (let i = 0; i < 3; i++) {
                try {
                    await breaker.execute(intermittentFn);
                } catch (error) {}
            }

            expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

            await new Promise((resolve) => setTimeout(resolve, 150));

            await breaker.execute(intermittentFn);
            await breaker.execute(intermittentFn);

            expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
        });

        it("should protect against cascading failures", async () => {
            const breaker = new CircuitBreaker("downstream", {
                failureThreshold: 3,
                successThreshold: 2,
                timeout: 5000,
                resetTimeout: 1000,
            });

            const failingService = vi.fn().mockRejectedValue(new Error("Service down"));

            for (let i = 0; i < 3; i++) {
                try {
                    await breaker.execute(failingService);
                } catch (error) {}
            }

            let rejectedCount = 0;
            for (let i = 0; i < 10; i++) {
                try {
                    await breaker.execute(failingService);
                } catch (error) {
                    rejectedCount++;
                }
            }

            expect(rejectedCount).toBe(10);
            expect(failingService).toHaveBeenCalledTimes(3);
        });
    });
});
