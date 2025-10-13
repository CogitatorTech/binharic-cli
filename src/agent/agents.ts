import { Experimental_Agent as Agent, stepCountIs, Output } from "ai";
import { z } from "zod";
import type { Config } from "@/config.js";
import { createLlmProvider } from "./llm.js";
import { tools } from "./tools/definitions/index.js";
import { generateSystemPrompt } from "./systemPrompt.js";
import logger from "@/logger.js";
import { createWorkflowTool } from "./tools/definitions/workflow.js";
import {
    createBudgetStopCondition,
    createErrorThresholdCondition,
    createValidationStopCondition,
    createCompletionCondition,
} from "./loopControl.js";
import {
    createContextManager,
    createToolResultSummarizer,
    createAdaptiveSystemPrompt,
    combinePrepareSteps,
} from "./prepareStep.js";

export async function createBinharicAgent(config: Config) {
    const modelConfig = config.models.find((m) => m.name === config.defaultModel);
    if (!modelConfig) {
        throw new Error(`Model ${config.defaultModel} not found in configuration`);
    }

    const llmProvider = createLlmProvider(modelConfig, config);
    const systemPrompt = await generateSystemPrompt(config);

    const workflowTool = createWorkflowTool(config);

    const agent = new Agent({
        model: llmProvider,
        system: systemPrompt,
        tools: {
            ...tools,
            execute_workflow: workflowTool,
        },
        stopWhen: [
            stepCountIs(50),
            createBudgetStopCondition(5.0),
            createErrorThresholdCondition(10),
            createValidationStopCondition(),
            createCompletionCondition(),
        ],
        prepareStep: combinePrepareSteps(
            createContextManager(30),
            createToolResultSummarizer(5000),
            createAdaptiveSystemPrompt(systemPrompt),
        ),
        toolChoice: "auto",
        experimental_telemetry: { isEnabled: false },
    });

    logger.info("Binharic agent created with advanced loop control", {
        model: modelConfig.name,
        provider: modelConfig.provider,
        toolCount: Object.keys(tools).length + 1,
        stopConditions: 5,
        prepareStepHandlers: 3,
    });

    return agent;
}

const documentationSchema = z.object({
    summary: z.string().describe("Brief summary of the component/function"),
    description: z.string().describe("Detailed description"),
    parameters: z
        .array(
            z.object({
                name: z.string(),
                type: z.string(),
                description: z.string(),
            }),
        )
        .optional(),
    returns: z
        .object({
            type: z.string(),
            description: z.string(),
        })
        .optional(),
    examples: z.array(
        z.object({
            title: z.string(),
            code: z.string(),
        }),
    ),
});

export async function createDocumentationAgent(config: Config) {
    const modelConfig = config.models.find((m) => m.name === config.defaultModel);
    if (!modelConfig) {
        throw new Error(`Model ${config.defaultModel} not found in configuration`);
    }

    const llmProvider = createLlmProvider(modelConfig, config);

    const docTools = {
        read_file: tools.read_file,
        list: tools.list,
        search: tools.search,
        insert_edit_into_file: tools.insert_edit_into_file,
    };

    const agent = new Agent({
        model: llmProvider,
        system: "You are a technical documentation specialist. Create clear, comprehensive documentation.",
        tools: docTools,
        stopWhen: stepCountIs(15),
        toolChoice: "auto",
        experimental_output: Output.object({
            schema: documentationSchema,
        }),
        experimental_telemetry: { isEnabled: false },
    });

    logger.info("Documentation agent created", {
        model: modelConfig.name,
        toolCount: Object.keys(docTools).length,
    });

    return agent;
}

export async function createCodeAnalysisAgent(config: Config) {
    const modelConfig = config.models.find((m) => m.name === config.defaultModel);
    if (!modelConfig) {
        throw new Error(`Model ${config.defaultModel} not found in configuration`);
    }

    const llmProvider = createLlmProvider(modelConfig, config);

    const analysisTools = {
        read_file: tools.read_file,
        list: tools.list,
        search: tools.search,
        grep_search: tools.grep_search,
        get_errors: tools.get_errors,
    };

    const agent = new Agent({
        model: llmProvider,
        system: "You are a code quality analyst. Focus on maintainability, clarity, and best practices.",
        tools: analysisTools,
        stopWhen: stepCountIs(15),
        toolChoice: "auto",
        experimental_telemetry: { isEnabled: false },
    });

    logger.info("Code analysis agent created", {
        model: modelConfig.name,
        toolCount: Object.keys(analysisTools).length,
    });

    return agent;
}

export async function createSecurityAuditAgent(config: Config) {
    const modelConfig = config.models.find((m) => m.name === config.defaultModel);
    if (!modelConfig) {
        throw new Error(`Model ${config.defaultModel} not found in configuration`);
    }

    const llmProvider = createLlmProvider(modelConfig, config);

    const securityTools = {
        read_file: tools.read_file,
        list: tools.list,
        search: tools.search,
        grep_search: tools.grep_search,
        bash: tools.bash,
    };

    const agent = new Agent({
        model: llmProvider,
        system: "You are a security auditor. Identify vulnerabilities and recommend fixes.",
        tools: securityTools,
        stopWhen: stepCountIs(20),
        toolChoice: "required",
        experimental_telemetry: { isEnabled: false },
    });

    logger.info("Security audit agent created", {
        model: modelConfig.name,
        toolCount: Object.keys(securityTools).length,
    });

    return agent;
}

export async function createRefactoringAgent(config: Config) {
    const modelConfig = config.models.find((m) => m.name === config.defaultModel);
    if (!modelConfig) {
        throw new Error(`Model ${config.defaultModel} not found in configuration`);
    }

    const llmProvider = createLlmProvider(modelConfig, config);

    const refactorTools = {
        read_file: tools.read_file,
        insert_edit_into_file: tools.insert_edit_into_file,
        create: tools.create,
        get_errors: tools.get_errors,
        run_in_terminal: tools.run_in_terminal,
    };

    const agent = new Agent({
        model: llmProvider,
        system: "You are a refactoring specialist. Improve code structure incrementally without breaking behavior.",
        tools: refactorTools,
        stopWhen: stepCountIs(25),
        toolChoice: "auto",
        experimental_telemetry: { isEnabled: false },
    });

    logger.info("Refactoring agent created", {
        model: modelConfig.name,
        toolCount: Object.keys(refactorTools).length,
    });

    return agent;
}

export async function createTestGenerationAgent(config: Config) {
    const modelConfig = config.models.find((m) => m.name === config.defaultModel);
    if (!modelConfig) {
        throw new Error(`Model ${config.defaultModel} not found in configuration`);
    }

    const llmProvider = createLlmProvider(modelConfig, config);

    const testTools = {
        read_file: tools.read_file,
        create: tools.create,
        list: tools.list,
        run_in_terminal: tools.run_in_terminal,
        get_terminal_output: tools.get_terminal_output,
    };

    const agent = new Agent({
        model: llmProvider,
        system: "You generate comprehensive tests following the Arrange-Act-Assert pattern.",
        tools: testTools,
        stopWhen: stepCountIs(20),
        toolChoice: "auto",
        experimental_telemetry: { isEnabled: false },
    });

    logger.info("Test generation agent created", {
        model: modelConfig.name,
        toolCount: Object.keys(testTools).length,
    });

    return agent;
}

export type BinharicAgentType =
    | "general"
    | "code-analysis"
    | "security-audit"
    | "refactoring"
    | "test-generation"
    | "documentation";

export async function createAgentByType(type: BinharicAgentType, config: Config) {
    switch (type) {
        case "general":
            return createBinharicAgent(config);
        case "documentation":
            return createDocumentationAgent(config);
        case "code-analysis":
            return createCodeAnalysisAgent(config);
        case "security-audit":
            return createSecurityAuditAgent(config);
        case "refactoring":
            return createRefactoringAgent(config);
        case "test-generation":
            return createTestGenerationAgent(config);
        default:
            throw new Error(`Unknown agent type: ${type}`);
    }
}
