import logger from "@/logger.js";

export enum CircuitBreakerState {
    CLOSED = "CLOSED",
    OPEN = "OPEN",
    HALF_OPEN = "HALF_OPEN",
}

export interface CircuitBreakerConfig {
    failureThreshold: number;
    successThreshold: number;
    timeout: number;
    resetTimeout: number;
}

export class CircuitBreaker {
    private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
    private failureCount = 0;
    private successCount = 0;
    private nextAttempt = Date.now();
    private lastFailureTime = 0;

    constructor(
        private name: string,
        private config: CircuitBreakerConfig,
    ) {}

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === CircuitBreakerState.OPEN) {
            if (Date.now() < this.nextAttempt) {
                const waitTime = Math.ceil((this.nextAttempt - Date.now()) / 1000);
                logger.warn(
                    `Circuit breaker [${this.name}] is OPEN. Retry in ${waitTime}s. ` +
                        `Failure count: ${this.failureCount}/${this.config.failureThreshold}`,
                );
                throw new Error(
                    `Circuit breaker is OPEN for ${this.name}. Service temporarily unavailable. Retry in ${waitTime}s.`,
                );
            }
            this.state = CircuitBreakerState.HALF_OPEN;
            this.successCount = 0;
            logger.info(`Circuit breaker [${this.name}] entering HALF_OPEN state`);
        }

        try {
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(
                    () =>
                        reject(new Error(`Circuit breaker timeout after ${this.config.timeout}ms`)),
                    this.config.timeout,
                );
            });

            const result = await Promise.race([fn(), timeoutPromise]);

            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    getState(): CircuitBreakerState {
        return this.state;
    }

    getStats() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            lastFailureTime: this.lastFailureTime,
            nextAttemptTime: this.nextAttempt,
        };
    }

    reset(): void {
        this.state = CircuitBreakerState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.nextAttempt = Date.now();
        logger.info(`Circuit breaker [${this.name}] has been reset`);
    }

    private onSuccess(): void {
        this.failureCount = 0;

        if (this.state === CircuitBreakerState.HALF_OPEN) {
            this.successCount++;
            logger.info(
                `Circuit breaker [${this.name}] success in HALF_OPEN: ${this.successCount}/${this.config.successThreshold}`,
            );

            if (this.successCount >= this.config.successThreshold) {
                this.state = CircuitBreakerState.CLOSED;
                this.successCount = 0;
                logger.info(`Circuit breaker [${this.name}] is now CLOSED`);
            }
        }
    }

    private onFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        logger.warn(
            `Circuit breaker [${this.name}] failure: ${this.failureCount}/${this.config.failureThreshold}`,
        );

        if (this.state === CircuitBreakerState.HALF_OPEN) {
            this.state = CircuitBreakerState.OPEN;
            this.nextAttempt = Date.now() + this.config.resetTimeout;
            logger.error(`Circuit breaker [${this.name}] opened from HALF_OPEN state`);
            return;
        }

        if (this.failureCount >= this.config.failureThreshold) {
            this.state = CircuitBreakerState.OPEN;
            this.nextAttempt = Date.now() + this.config.resetTimeout;
            logger.error(
                `Circuit breaker [${this.name}] is now OPEN. Will retry after ${this.config.resetTimeout}ms`,
            );
        }
    }
}

const circuitBreakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(
    name: string,
    config?: Partial<CircuitBreakerConfig>,
): CircuitBreaker {
    if (!circuitBreakers.has(name)) {
        const defaultConfig: CircuitBreakerConfig = {
            failureThreshold: 5,
            successThreshold: 2,
            timeout: 60000,
            resetTimeout: 60000,
        };

        circuitBreakers.set(name, new CircuitBreaker(name, { ...defaultConfig, ...config }));
    }
    return circuitBreakers.get(name)!;
}

export function resetAllCircuitBreakers(): void {
    for (const breaker of circuitBreakers.values()) {
        breaker.reset();
    }
    logger.info("All circuit breakers have been reset");
}

export function getCircuitBreakerStats() {
    const stats: Record<string, ReturnType<CircuitBreaker["getStats"]>> = {};
    for (const [name, breaker] of circuitBreakers.entries()) {
        stats[name] = breaker.getStats();
    }
    return stats;
}
