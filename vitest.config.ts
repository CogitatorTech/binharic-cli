import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    test: {
        testTimeout: 60000,
        hookTimeout: 60000,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
