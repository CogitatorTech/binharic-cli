import logger from "@/logger.js";

export interface StoppingCondition {
    check: () => boolean;
    reason: string;
}

export interface TaskSuccessCriteria {
    testsPass?: boolean;
    buildSucceeds?: boolean;
    noErrors?: boolean;
    customCheck?: () => Promise<boolean>;
}

export interface StoppingConfig {
    maxSteps?: number;
    maxTokens?: number;
    maxCost?: number;
    timeLimit?: number;
    errorThreshold?: number;
    successCriteria?: TaskSuccessCriteria;
}

export class StoppingConditionManager {
    private startTime: number = Date.now();
    private stepCount: number = 0;
    private tokenCount: number = 0;
    private estimatedCost: number = 0;
    private errorCount: number = 0;
    private config: StoppingConfig;

    constructor(config: StoppingConfig = {}) {
        this.config = {
            maxSteps: config.maxSteps ?? 20,
            maxTokens: config.maxTokens ?? 100000,
            maxCost: config.maxCost ?? 1.0,
            timeLimit: config.timeLimit ?? 300000,
            errorThreshold: config.errorThreshold ?? 5,
            ...config,
        };
        logger.info("Stopping condition manager initialized", this.config);
    }

    incrementStep(): void {
        this.stepCount++;
    }

    addTokens(count: number): void {
        this.tokenCount += count;
    }

    addCost(cost: number): void {
        this.estimatedCost += cost;
    }

    incrementError(): void {
        this.errorCount++;
    }

    getElapsedTime(): number {
        return Date.now() - this.startTime;
    }

    shouldStop(): { stop: boolean; reason?: string } {
        if (this.config.maxSteps && this.stepCount >= this.config.maxSteps) {
            return {
                stop: true,
                reason: `Maximum steps reached (${this.stepCount}/${this.config.maxSteps})`,
            };
        }

        if (this.config.maxTokens && this.tokenCount >= this.config.maxTokens) {
            return {
                stop: true,
                reason: `Token limit reached (${this.tokenCount}/${this.config.maxTokens})`,
            };
        }

        if (this.config.maxCost && this.estimatedCost >= this.config.maxCost) {
            return {
                stop: true,
                reason: `Cost budget exceeded ($${this.estimatedCost.toFixed(3)}/$${this.config.maxCost})`,
            };
        }

        if (this.config.timeLimit && this.getElapsedTime() >= this.config.timeLimit) {
            return {
                stop: true,
                reason: `Time limit reached (${Math.round(this.getElapsedTime() / 1000)}s/${Math.round(this.config.timeLimit / 1000)}s)`,
            };
        }

        if (this.config.errorThreshold && this.errorCount >= this.config.errorThreshold) {
            return {
                stop: true,
                reason: `Error threshold exceeded (${this.errorCount}/${this.config.errorThreshold})`,
            };
        }

        return { stop: false };
    }

    async checkSuccessCriteria(): Promise<{ met: boolean; details: string }> {
        if (!this.config.successCriteria) {
            return { met: false, details: "No success criteria defined" };
        }

        const criteria = this.config.successCriteria;
        const checks: string[] = [];

        if (criteria.customCheck) {
            try {
                const result = await criteria.customCheck();
                if (result) {
                    checks.push("Custom criteria met");
                } else {
                    return { met: false, details: "Custom criteria not met" };
                }
            } catch (error) {
                return {
                    met: false,
                    details: `Custom criteria check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                };
            }
        }

        if (checks.length > 0) {
            return { met: true, details: checks.join(", ") };
        }

        return { met: false, details: "No applicable success criteria" };
    }

    getStats() {
        return {
            stepCount: this.stepCount,
            tokenCount: this.tokenCount,
            estimatedCost: this.estimatedCost,
            errorCount: this.errorCount,
            elapsedTime: this.getElapsedTime(),
            config: this.config,
        };
    }

    reset(): void {
        this.startTime = Date.now();
        this.stepCount = 0;
        this.tokenCount = 0;
        this.estimatedCost = 0;
        this.errorCount = 0;
        logger.info("Stopping condition manager reset");
    }
}

export function createStopWhen(manager: StoppingConditionManager) {
    return () => {
        manager.incrementStep();
        const { stop, reason } = manager.shouldStop();

        if (stop) {
            logger.info("Stopping condition met", { reason });
        }

        return stop;
    };
}
