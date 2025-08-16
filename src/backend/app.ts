import express from "express";
import "express-async-errors"; // Must be imported before your routes
import { fileURLToPath } from "url";
import path from "path";
import { errorHandler } from "./middleware.js";
import routes from "./routes.js";

// --- MIDDLEWARE ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// --- ROUTES ---
app.use("/api", routes);

// --- STATIC FILES ---
// In production, the frontend files are served from the backend server.
// In development, the frontend and backend servers are run separately
// and the frontend is served from a different port.
if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../frontend/public")));
}

// --- ERROR HANDLER ---
// Error handler must be the last middleware
app.use(errorHandler);

export default app;
