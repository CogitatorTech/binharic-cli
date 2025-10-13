import logger from "@/logger.js";

export interface WorkflowSuggestion {
    workflowType: string;
    confidence: number;
    reasoning: string;
    suggestedParams: Record<string, unknown>;
}

const workflowPatterns = [
    {
        pattern: /security|vulnerability|exploit|injection|xss|csrf/i,
        workflowType: "security-audit",
        confidence: 0.95,
        reasoning: "Security-related keywords detected",
    },
    {
        pattern: /review|audit|check|analyze|inspect|examine.*code/i,
        workflowType: "code-review",
        confidence: 0.9,
        reasoning: "User request indicates code review needed",
    },
    {
        pattern: /fix.*bug|debug|error|issue|problem/i,
        workflowType: "fix-bug",
        confidence: 0.85,
        reasoning: "Bug fixing task identified",
    },
    {
        pattern: /add.*feature|implement|new.*functionality|create.*feature/i,
        workflowType: "orchestrated-implementation",
        confidence: 0.9,
        reasoning: "Feature implementation request detected",
    },
    {
        pattern: /refactor|clean.*up|improve.*structure|reorganize/i,
        workflowType: "refactoring-feedback",
        confidence: 0.85,
        reasoning: "Code refactoring task identified",
    },
    {
        pattern: /optimize|performance|speed.*up|slow|faster/i,
        workflowType: "performance-optimize",
        confidence: 0.88,
        reasoning: "Performance optimization needed",
    },
    {
        pattern: /test|coverage|unit.*test|integration.*test/i,
        workflowType: "test-coverage",
        confidence: 0.85,
        reasoning: "Testing-related task detected",
    },
    {
        pattern: /document|docs|documentation|readme|api.*docs/i,
        workflowType: "adaptive-docs",
        confidence: 0.9,
        reasoning: "Documentation generation requested",
    },
    {
        pattern: /migrate|upgrade|update.*to|port.*to/i,
        workflowType: "migration",
        confidence: 0.87,
        reasoning: "Migration or upgrade task detected",
    },
];

export function detectWorkflow(userInput: string): WorkflowSuggestion | null {
    logger.debug("Detecting workflow for input", { input: userInput.substring(0, 100) });

    for (const pattern of workflowPatterns) {
        if (pattern.pattern.test(userInput)) {
            logger.info("Workflow detected", {
                type: pattern.workflowType,
                confidence: pattern.confidence,
            });

            return {
                workflowType: pattern.workflowType,
                confidence: pattern.confidence,
                reasoning: pattern.reasoning,
                suggestedParams: extractParams(userInput, pattern.workflowType),
            };
        }
    }

    logger.debug("No specific workflow detected");
    return null;
}

function extractParams(userInput: string, workflowType: string): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    const filePathMatch = userInput.match(
        /(?:in|for|file|path)\s+([^\s]+\.(?:ts|js|tsx|jsx|py|java|go|rs))/i,
    );
    if (filePathMatch) {
        params.filePath = filePathMatch[1];
    }

    const multiFileMatch = userInput.match(/(?:files|paths)\s*:\s*([^\n]+)/i);
    if (multiFileMatch) {
        params.filePaths = multiFileMatch[1].split(",").map((p) => p.trim());
    }

    if (workflowType === "adaptive-docs") {
        if (userInput.match(/beginner|novice|junior|new/i)) {
            params.targetAudience = "beginner";
        } else if (userInput.match(/expert|advanced|senior/i)) {
            params.targetAudience = "expert";
        } else {
            params.targetAudience = "intermediate";
        }
    }

    if (workflowType === "migration") {
        const targetMatch = userInput.match(
            /(?:to|upgrade.*to|migrate.*to)\s+([^\s,]+(?:\s+\d+)?)/i,
        );
        if (targetMatch) {
            params.migrationTarget = targetMatch[1];
        }
    }

    if (workflowType === "code-review") {
        if (userInput.match(/security/i)) {
            params.reviewScope = "security";
        } else if (userInput.match(/performance/i)) {
            params.reviewScope = "performance";
        } else if (userInput.match(/quality/i)) {
            params.reviewScope = "quality";
        } else {
            params.reviewScope = "all";
        }
    }

    return params;
}

export function shouldUseWorkflow(userInput: string): boolean {
    const complexityIndicators = [
        /multiple.*files?/i,
        /entire.*(?:codebase|project|repository)/i,
        /step.*by.*step/i,
        /comprehensive|thorough|complete|full/i,
        /analyze.*and.*(?:fix|improve|refactor)/i,
    ];

    return complexityIndicators.some((indicator) => indicator.test(userInput));
}
