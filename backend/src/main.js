import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { initSchema } from "./db.js";
import authRoutes from "./routes/auth.js";
import editorRoutes from "./routes/editors.js";
import postRoutes from "./routes/posts.js";
import statsRoutes from "./routes/stats.js";

const app = express();
const port = Number(process.env.PORT) || 3000;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: frontendUrl.split(",").map((value) => value.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "leviaan-campus" });
});

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/editors", editorRoutes);
app.use("/api/stats", statsRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Er ging iets mis. Probeer het later opnieuw." });
});

async function start() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
  }
  await initSchema();
  app.listen(port, () => {
    console.log(`Leviaan Campus API listening on ${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
