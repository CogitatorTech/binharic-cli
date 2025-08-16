import dotenv from "dotenv";
import { z } from "zod";

dotenv.config(); // Load .env file

const envSchema = z.object({
    ENVIRONMENT: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
});

// Parse and validate process.env
const env = envSchema.parse(process.env);

export default env;
