import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "@/backend/app.js";

describe("GET /api/status", () => {
    it("should respond with a 200 status code and a status object", async () => {
        const response = await request(app).get("/api/status");
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty("status", "ok");
        expect(response.body).toHaveProperty("timestamp");
        expect(typeof response.body.timestamp).toBe("string");
    });
});
