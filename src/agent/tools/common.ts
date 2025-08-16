// src/agent/tools/common.ts
import { z } from "zod";
import type { Config } from "@/config";

export type ToolDef<
    T extends z.ZodObject<{
        name: z.ZodLiteral<string>;
        arguments: z.ZodType;
    }>,
> = {
    schema: T;
    implementation: (args: z.infer<T>["arguments"], config?: Config) => Promise<unknown>;
    description?: string;
};
