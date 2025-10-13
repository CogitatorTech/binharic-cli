import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    StoppingConditionManager,
    createStopWhen,
    type StoppingConfig,
} from "@/agent/stoppingConditions.js";

describe("Stopping Conditions Module", () => {
    let manager: StoppingConditionManager;

    beforeEach(() => {
        manager = new StoppingConditionManager({
            maxSteps: 10,
            maxTokens: 1000,
            maxCost: 0.5,
            timeLimit: 5000,
            errorThreshold: 3,
        });
    });

    describe("StoppingConditionManager", () => {
        it("should initialize with default config", () => {
            const defaultManager = new StoppingConditionManager();
            const stats = defaultManager.getStats();

            expect(stats.config.maxSteps).toBe(20);
            expect(stats.stepCount).toBe(0);
        });

        it("should track step count", () => {
            manager.incrementStep();
            manager.incrementStep();

            const stats = manager.getStats();
            expect(stats.stepCount).toBe(2);
        });

        it("should track token count", () => {
            manager.addTokens(100);
            manager.addTokens(200);

            const stats = manager.getStats();
            expect(stats.tokenCount).toBe(300);
        });

        it("should track cost", () => {
            manager.addCost(0.1);
            manager.addCost(0.15);

            const stats = manager.getStats();
            expect(stats.estimatedCost).toBeCloseTo(0.25);
        });

        it("should track errors", () => {
            manager.incrementError();
            manager.incrementError();

            const stats = manager.getStats();
            expect(stats.errorCount).toBe(2);
        });

        it("should calculate elapsed time", () => {
            const elapsed = manager.getElapsedTime();
            expect(elapsed).toBeGreaterThanOrEqual(0);
        });

        it("should reset all counters", () => {
            manager.incrementStep();
            manager.addTokens(500);
            manager.addCost(0.3);
            manager.incrementError();

            manager.reset();

            const stats = manager.getStats();
            expect(stats.stepCount).toBe(0);
            expect(stats.tokenCount).toBe(0);
            expect(stats.estimatedCost).toBe(0);
            expect(stats.errorCount).toBe(0);
        });
    });

    describe("shouldStop", () => {
        it("should stop when max steps reached", () => {
            for (let i = 0; i < 10; i++) {
                manager.incrementStep();
            }

            const result = manager.shouldStop();
            expect(result.stop).toBe(true);
            expect(result.reason).toContain("Maximum steps");
        });

        it("should stop when token limit reached", () => {
            manager.addTokens(1001);

            const result = manager.shouldStop();
            expect(result.stop).toBe(true);
            expect(result.reason).toContain("Token limit");
        });

        it("should stop when cost budget exceeded", () => {
            manager.addCost(0.6);

            const result = manager.shouldStop();
            expect(result.stop).toBe(true);
            expect(result.reason).toContain("Cost budget");
        });

        it("should stop when error threshold exceeded", () => {
            manager.incrementError();
            manager.incrementError();
            manager.incrementError();

            const result = manager.shouldStop();
            expect(result.stop).toBe(true);
            expect(result.reason).toContain("Error threshold");
        });

        it("should not stop when under all limits", () => {
            manager.incrementStep();
            manager.addTokens(100);
            manager.addCost(0.1);

            const result = manager.shouldStop();
            expect(result.stop).toBe(false);
        });
    });

    describe("checkSuccessCriteria", () => {
        it("should return false when no criteria defined", async () => {
            const result = await manager.checkSuccessCriteria();
            expect(result.met).toBe(false);
            expect(result.details).toContain("No success criteria");
        });

        it("should check custom criteria", async () => {
            const managerWithCriteria = new StoppingConditionManager({
                successCriteria: {
                    customCheck: async () => true,
                },
            });

            const result = await managerWithCriteria.checkSuccessCriteria();
            expect(result.met).toBe(true);
        });

        it("should handle custom criteria failure", async () => {
            const managerWithCriteria = new StoppingConditionManager({
                successCriteria: {
                    customCheck: async () => false,
                },
            });

            const result = await managerWithCriteria.checkSuccessCriteria();
            expect(result.met).toBe(false);
        });

        it("should handle custom criteria errors", async () => {
            const managerWithCriteria = new StoppingConditionManager({
                successCriteria: {
                    customCheck: async () => {
                        throw new Error("Check failed");
                    },
                },
            });

            const result = await managerWithCriteria.checkSuccessCriteria();
            expect(result.met).toBe(false);
            expect(result.details).toContain("failed");
        });
    });

    describe("createStopWhen", () => {
        it("should create function that increments steps", () => {
            const stopWhen = createStopWhen(manager);

            stopWhen();
            const stats = manager.getStats();
            expect(stats.stepCount).toBe(1);
        });

        it("should return true when stopping condition met", () => {
            for (let i = 0; i < 9; i++) {
                manager.incrementStep();
            }

            const stopWhen = createStopWhen(manager);
            const shouldStop = stopWhen();

            expect(shouldStop).toBe(true);
        });

        it("should return false when under limits", () => {
            const stopWhen = createStopWhen(manager);
            const shouldStop = stopWhen();

            expect(shouldStop).toBe(false);
        });
    });
});
