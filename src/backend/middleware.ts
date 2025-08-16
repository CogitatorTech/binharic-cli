import type { Request, Response, NextFunction } from "express";

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
    // Log the error for debugging purposes
    console.error(err.stack);

    // Default to a 500 server error
    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

    res.status(statusCode).json({
        message: err.message || "Something went wrong.",
        // Optionally include stack trace in development
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
}
