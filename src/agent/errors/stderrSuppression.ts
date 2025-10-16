import type logger from "@/logger.js";

let originalWrite: typeof process.stderr.write | null = null;

function isSuppressionEnabledFromEnv(): boolean {
    const v = process.env.BINHARIC_SUPPRESS_STDERR;
    if (v === undefined) return true;
    const val = String(v).toLowerCase();
    return !(val === "false" || val === "0" || val === "no" || val === "off");
}

export function initStderrSuppression(log: typeof logger): void {
    if (originalWrite) return;
    const enabled = isSuppressionEnabledFromEnv();
    if (!enabled) return;

    originalWrite = process.stderr.write.bind(process.stderr);

    process.stderr.write = function (chunk: unknown, encoding?: unknown, callback?: unknown) {
        const chunkStr = chunk?.toString() || "";
        const shouldSuppress =
            chunkStr.includes("APICallError") ||
            chunkStr.includes("AI_APICallError") ||
            chunkStr.includes("at file://") ||
            chunkStr.includes("at async") ||
            chunkStr.includes("at process.processTicksAndRejections") ||
            (chunkStr.includes("{") && chunkStr.includes("statusCode")) ||
            chunkStr.includes("requestBodyValues") ||
            chunkStr.includes("responseHeaders") ||
            chunkStr.includes("responseBody") ||
            chunkStr.includes("[Symbol(vercel.ai.error)]");

        if (shouldSuppress) {
            log.error("Suppressed stderr output:", { message: chunkStr.trim() });
            if (typeof callback === "function") {
                (callback as (err?: Error | null) => void)();
            }
            return true as any;
        }

        return (originalWrite as any)(chunk as string, encoding as any, callback as any);
    } as typeof process.stderr.write;
}

export function restoreStderrWrite(): void {
    if (originalWrite) {
        process.stderr.write = originalWrite;
        originalWrite = null;
    }
}

