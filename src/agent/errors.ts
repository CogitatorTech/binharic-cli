// src/agent/errors.ts
// REFACTORED: Centralized all custom agent errors in one place.

/**
 * A base class for all custom errors in the application.
 */
export class AppError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
    }
}

/**
 * Represents an error that is fatal and should stop the agent's execution.
 */
export class FatalError extends AppError {}

/**
 * Represents a transient error that might be resolved by retrying.
 */
export class TransientError extends AppError {}

/**
 * Represents an error related to tool execution.
 */
export class ToolError extends AppError {}

/**
 * Thrown when an edit is attempted on a file that has been modified
 * since it was last read by the agent.
 */
export class FileOutdatedError extends ToolError {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
    }
}

/**
 * Thrown when a 'create' operation is attempted on a file that already exists.
 */
export class FileExistsError extends ToolError {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
    }
}
