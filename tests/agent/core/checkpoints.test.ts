import { beforeEach, describe, expect, it } from "vitest";
import {
    assessRiskLevel,
    calculateConfidence,
    type CheckpointRequest,
    clearCheckpointHandler,
    requestCheckpoint,
    setCheckpointHandler,
} from "@/agent/core/checkpoints.js";

describe("Checkpoints Module", () => {
    beforeEach(() => {
        clearCheckpointHandler();
    });

    describe("assessRiskLevel", () => {
        it("should assess critical risk for package.json deletion", () => {
            const risk = assessRiskLevel("delete", "package.json");
            expect(risk).toBe("critical");
        });

        it("should assess critical risk for config file edits", () => {
            const risk = assessRiskLevel("edit", "tsconfig.json");
            expect(risk).toBe("critical");
        });

        it("should assess high risk for any file deletion", () => {
            const risk = assessRiskLevel("delete", "src/test.ts");
            expect(risk).toBe("high");
        });

        it("should assess medium risk for source file edits", () => {
            const risk = assessRiskLevel("edit", "src/agent/agents.ts");
            expect(risk).toBe("medium");
        });

        it("should assess medium risk for bash operations", () => {
            const risk = assessRiskLevel("bash");
            expect(risk).toBe("medium");
        });

        it("should assess critical risk for dangerous bash commands", () => {
            const risk = assessRiskLevel("bash", "rm -rf /");
            expect(risk).toBe("critical");
        });

        it("should assess low risk for create operations", () => {
            const risk = assessRiskLevel("create", "new-file.txt");
            expect(risk).toBe("low");
        });
    });

    describe("calculateConfidence", () => {
        it("should give high confidence when file was read", () => {
            const confidence = calculateConfidence("edit", { hasReadFile: true });
            expect(confidence.score).toBeGreaterThanOrEqual(7);
            expect(confidence.recommendation).toBe("proceed");
        });

        it("should give low confidence when file not read before edit", () => {
            const confidence = calculateConfidence("edit", { hasReadFile: false });
            expect(confidence.score).toBeLessThan(4);
            expect(confidence.recommendation).toBe("abort");
        });

        it("should increase confidence with validation", () => {
            const confidence = calculateConfidence("edit", {
                hasReadFile: true,
                hasValidated: true,
            });
            expect(confidence.score).toBeGreaterThanOrEqual(9);
            expect(confidence.recommendation).toBe("proceed");
        });

        it("should decrease confidence with errors", () => {
            const confidence = calculateConfidence("edit", {
                hasReadFile: true,
                errorCount: 3,
            });
            expect(confidence.score).toBeLessThan(7);
        });

        it("should include factors in result", () => {
            const confidence = calculateConfidence("edit", {
                hasReadFile: true,
                errorCount: 1,
            });
            expect(confidence.factors.length).toBeGreaterThan(0);
            expect(confidence.factors.some((f) => f.includes("File was read"))).toBe(true);
        });
    });

    describe("requestCheckpoint", () => {
        it("should auto-approve non-critical operations without handler", async () => {
            const request: CheckpointRequest = {
                operation: "edit",
                riskLevel: "medium",
                description: "Edit a file",
            };

            const decision = await requestCheckpoint(request);
            expect(decision.approved).toBe(true);
        });

        it("should deny critical operations without handler", async () => {
            const request: CheckpointRequest = {
                operation: "delete",
                riskLevel: "critical",
                description: "Delete critical file",
                filePath: "package.json",
            };

            const decision = await requestCheckpoint(request);
            expect(decision.approved).toBe(false);
            expect(decision.reason).toContain("require human approval");
        });

        it("should call checkpoint handler when registered", async () => {
            let handlerCalled = false;

            setCheckpointHandler(async (request) => {
                handlerCalled = true;
                return { approved: true, reason: "Approved by handler" };
            });

            const request: CheckpointRequest = {
                operation: "edit",
                riskLevel: "high",
                description: "Edit important file",
            };

            const decision = await requestCheckpoint(request);
            expect(handlerCalled).toBe(true);
            expect(decision.approved).toBe(true);
        });

        it("should respect handler denial", async () => {
            setCheckpointHandler(async () => {
                return { approved: false, reason: "Operation not allowed" };
            });

            const request: CheckpointRequest = {
                operation: "delete",
                riskLevel: "high",
                description: "Delete file",
            };

            const decision = await requestCheckpoint(request);
            expect(decision.approved).toBe(false);
            expect(decision.reason).toBe("Operation not allowed");
        });
    });
});
