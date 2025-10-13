import logger from "@/logger.js";

export interface CheckpointDecision {
    approved: boolean;
    reason?: string;
}

export interface CheckpointRequest {
    operation: string;
    riskLevel: "low" | "medium" | "high" | "critical";
    filePath?: string;
    description: string;
    details?: Record<string, unknown>;
}

export type CheckpointHandler = (request: CheckpointRequest) => Promise<CheckpointDecision>;

let checkpointHandler: CheckpointHandler | null = null;

export function setCheckpointHandler(handler: CheckpointHandler) {
    checkpointHandler = handler;
    logger.info("Checkpoint handler registered");
}

export function clearCheckpointHandler() {
    checkpointHandler = null;
    logger.info("Checkpoint handler cleared");
}

export async function requestCheckpoint(request: CheckpointRequest): Promise<CheckpointDecision> {
    logger.info("Checkpoint requested", {
        operation: request.operation,
        riskLevel: request.riskLevel,
    });

    if (!checkpointHandler) {
        if (request.riskLevel === "critical") {
            logger.warn("Critical operation attempted without checkpoint handler - denying");
            return {
                approved: false,
                reason: "Critical operations require human approval, but no checkpoint handler is configured",
            };
        }
        logger.debug("No checkpoint handler - auto-approving non-critical operation");
        return { approved: true };
    }

    const decision = await checkpointHandler(request);

    logger.info("Checkpoint decision received", {
        operation: request.operation,
        approved: decision.approved,
        reason: decision.reason,
    });

    return decision;
}

export function assessRiskLevel(
    operation: string,
    filePath?: string,
): "low" | "medium" | "high" | "critical" {
    const criticalPatterns = [
        /package\.json$/,
        /tsconfig\.json$/,
        /\.env$/,
        /config\.(ts|js|json)$/,
    ];

    const highRiskPatterns = [/src\/.*\.(ts|js)$/, /test.*\.(ts|js)$/];

    if (operation === "delete") {
        if (filePath && criticalPatterns.some((pattern) => pattern.test(filePath))) {
            return "critical";
        }
        return "high";
    }

    if (operation === "edit" && filePath) {
        if (criticalPatterns.some((pattern) => pattern.test(filePath))) {
            return "critical";
        }
        if (highRiskPatterns.some((pattern) => pattern.test(filePath))) {
            return "medium";
        }
    }

    if (operation === "bash") {
        const dangerousCommands = ["rm -rf", "mkfs", "dd", "format"];
        if (filePath && dangerousCommands.some((cmd) => filePath.includes(cmd))) {
            return "critical";
        }
        return "medium";
    }

    return "low";
}

export interface ConfidenceScore {
    score: number;
    factors: string[];
    recommendation: "proceed" | "review" | "abort";
}

export function calculateConfidence(
    operation: string,
    context: {
        hasReadFile?: boolean;
        hasValidated?: boolean;
        errorCount?: number;
        similarOperationsSucceeded?: number;
    },
): ConfidenceScore {
    let score = 5.0;
    const factors: string[] = [];

    if (context.hasReadFile) {
        score += 2.0;
        factors.push("File was read before modification (+2.0)");
    } else if (operation === "edit") {
        score -= 3.0;
        factors.push("File not read before editing (-3.0)");
    }

    if (context.hasValidated) {
        score += 2.0;
        factors.push("Previous operation was validated (+2.0)");
    }

    if (context.errorCount !== undefined) {
        const errorPenalty = Math.min(context.errorCount * 1.0, 4.0);
        score -= errorPenalty;
        factors.push(`Recent errors: ${context.errorCount} (-${errorPenalty.toFixed(1)})`);
    }

    if (
        context.similarOperationsSucceeded !== undefined &&
        context.similarOperationsSucceeded > 0
    ) {
        const successBonus = Math.min(context.similarOperationsSucceeded * 0.5, 2.0);
        score += successBonus;
        factors.push(
            `Similar operations succeeded: ${context.similarOperationsSucceeded} (+${successBonus.toFixed(1)})`,
        );
    }

    score = Math.max(0, Math.min(10, score));

    let recommendation: "proceed" | "review" | "abort";
    if (score >= 7) {
        recommendation = "proceed";
    } else if (score >= 4) {
        recommendation = "review";
    } else {
        recommendation = "abort";
    }

    return { score, factors, recommendation };
}
