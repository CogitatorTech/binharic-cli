export class AppError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class FatalError extends AppError {}

export class TransientError extends AppError {}

export class ToolError extends AppError {}

export class FileOutdatedError extends ToolError {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class FileExistsError extends ToolError {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
    }
}
