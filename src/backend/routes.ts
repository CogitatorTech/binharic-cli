import type { Request, Response } from "express";
import { Router } from "express";

const router = Router();

// --- Your routes go here ---
router.get("/status", (req: Request, res: Response) => {
    res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
    });
});

// An example route that throws an error
router.get("/error", (_req: Request, _res: Response) => {
    throw new Error("This is a test error!");
});

export default router;
