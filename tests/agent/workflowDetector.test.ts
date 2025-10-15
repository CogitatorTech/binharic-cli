import { describe, expect, it } from "vitest";
import { detectWorkflow, shouldUseWorkflow } from "@/agent/workflows/detector";

describe("workflowDetector", () => {
    it("detects code review requests", () => {
        const res = detectWorkflow("Please review this code for quality");
        expect(res).toBeTruthy();
        expect(res?.workflowType).toBe("code-review");
        expect(res?.confidence).toBeGreaterThan(0);
    });

    it("detects security audit by keywords", () => {
        const res = detectWorkflow("Check for xss and other vulnerabilities");
        expect(res?.workflowType).toBe("security-audit");
    });

    it("detects bug fix requests", () => {
        const res = detectWorkflow("Help me debug this issue in file src/app.ts");
        expect(res?.workflowType).toBe("fix-bug");
        expect(res?.suggestedParams.filePath).toBe("src/app.ts");
    });

    it("detects feature implementation requests", () => {
        const res = detectWorkflow("Please add a new feature to create reports");
        expect(res?.workflowType).toBe("orchestrated-implementation");
    });

    it("detects refactoring tasks", () => {
        const res = detectWorkflow("Refactor and clean up the utils module");
        expect(res?.workflowType).toBe("refactoring-feedback");
    });

    it("detects performance optimization", () => {
        const res = detectWorkflow("The app is slow, optimize performance");
        expect(res?.workflowType).toBe("performance-optimize");
    });

    it("extracts adaptive docs target audience", () => {
        const res = detectWorkflow("Document the API for beginner developers");
        expect(res?.workflowType).toBe("adaptive-docs");
        expect(res?.suggestedParams.targetAudience).toBe("beginner");
    });

    it("extracts migration target", () => {
        const res = detectWorkflow("Migrate project to Node 20");
        expect(res?.workflowType).toBe("migration");
        expect(res?.suggestedParams.migrationTarget).toContain("Node 20");
    });

    it("sets review scope for code-review based on keywords", () => {
        const res = detectWorkflow("Please review this module for performance issues");
        expect(res?.workflowType).toBe("code-review");
        expect(res?.suggestedParams.reviewScope).toBe("performance");
    });

    it("returns null when no workflow is detected", () => {
        const res = detectWorkflow("Hello there");
        expect(res).toBeNull();
    });

    it("shouldUseWorkflow returns true for complex queries", () => {
        const input = "Analyze entire repository and provide step by step improvements";
        expect(shouldUseWorkflow(input)).toBe(true);
    });

    it("shouldUseWorkflow returns false for simple queries", () => {
        const input = "Say hi";
        expect(shouldUseWorkflow(input)).toBe(false);
    });
});
