import { StopCondition } from "ai";
import logger from "@/logger.js";

export function createBudgetStopCondition(maxCostUSD: number): StopCondition<any> {
    return ({ steps }) => {
        const totalUsage = steps.reduce(
            (acc, step) => ({
                inputTokens: acc.inputTokens + (step.usage?.inputTokens ?? 0),
                outputTokens: acc.outputTokens + (step.usage?.outputTokens ?? 0),
            }),
            { inputTokens: 0, outputTokens: 0 },
        );

        const costEstimate =
            (totalUsage.inputTokens * 0.01 + totalUsage.outputTokens * 0.03) / 1000;

        if (costEstimate > maxCostUSD) {
            logger.warn(`Budget exceeded: $${costEstimate.toFixed(3)} > $${maxCostUSD}`);
        }

        return costEstimate > maxCostUSD;
    };
}

export function createSuccessCondition(successMarker: string): StopCondition<any> {
    return ({ steps }) => {
        const hasSuccess = steps.some((step) => step.text?.includes(successMarker)) ?? false;

        if (hasSuccess) {
            logger.info(`Success condition met: found "${successMarker}"`);
        }

        return hasSuccess;
    };
}

export function createValidationStopCondition(): StopCondition<any> {
    return ({ steps }) => {
        const lastStep = steps[steps.length - 1];
        if (!lastStep) return false;

        const hasValidation = lastStep.toolCalls?.some((call) => call.toolName === "validate");

        const validationPassed =
            lastStep.toolResults?.some((result) => {
                const resultContent = (result as any).result;
                return (
                    result.toolName === "validate" &&
                    typeof resultContent === "string" &&
                    resultContent.includes("✅")
                );
            }) ?? false;

        if (hasValidation && validationPassed) {
            logger.info("Validation passed - stopping");
        }

        return hasValidation && validationPassed;
    };
}

export function createErrorThresholdCondition(maxErrors: number): StopCondition<any> {
    return ({ steps }) => {
        const errorCount = steps.reduce((count, step) => {
            const stepErrors =
                step.toolResults?.filter((result) => {
                    const resultContent = (result as any).result;
                    if (typeof resultContent === "string") {
                        return resultContent.includes("error") || resultContent.includes("Error");
                    }
                    return false;
                }).length ?? 0;
            return count + stepErrors;
        }, 0);

        if (errorCount >= maxErrors) {
            logger.warn(`Error threshold reached: ${errorCount} >= ${maxErrors}`);
        }

        return errorCount >= maxErrors;
    };
}

export function createToolSequenceCondition(requiredSequence: string[]): StopCondition<any> {
    return ({ steps }) => {
        const toolCalls = steps.flatMap((step) => step.toolCalls ?? []);
        const toolNames = toolCalls.map((call) => call.toolName);

        let sequenceIndex = 0;
        for (const toolName of toolNames) {
            if (toolName === requiredSequence[sequenceIndex]) {
                sequenceIndex++;
                if (sequenceIndex === requiredSequence.length) {
                    logger.info(`Tool sequence completed: ${requiredSequence.join(" → ")}`);
                    return true;
                }
            }
        }

        return false;
    };
}

export function createTimeoutCondition(maxTimeMs: number): StopCondition<any> {
    const startTime = Date.now();

    return () => {
        const elapsed = Date.now() - startTime;
        if (elapsed > maxTimeMs) {
            logger.warn(`Timeout reached: ${elapsed}ms > ${maxTimeMs}ms`);
        }
        return elapsed > maxTimeMs;
    };
}

export function createCompletionCondition(): StopCondition<any> {
    return ({ steps }) => {
        const lastStep = steps[steps.length - 1];
        if (!lastStep) return false;

        const hasText = !!lastStep.text && lastStep.text.length > 50;
        const hasNoToolCalls = !lastStep.toolCalls || lastStep.toolCalls.length === 0;
        const endsWithCompletion =
            lastStep.text?.toLowerCase().includes("complete") ||
            lastStep.text?.toLowerCase().includes("finished") ||
            lastStep.text?.toLowerCase().includes("done");

        return hasText && hasNoToolCalls && !!endsWithCompletion;
    };
}
