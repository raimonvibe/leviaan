import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { initSchema } from "./db.js";
import { allowedOriginsFromEnv } from "./sanitize.js";
import authRoutes from "./routes/auth.js";
import editorRoutes from "./routes/editors.js";
import postRoutes from "./routes/posts.js";
import statsRoutes from "./routes/stats.js";

const app = express();
const port = Number(process.env.PORT) || 3000;
const allowedOrigins = allowedOriginsFromEnv(process.env.FRONTEND_URL || "http://localhost:5173");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Te veel inlogpogingen. Wacht even en probeer opnieuw." },
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Even rustig aan. Probeer het zo opnieuw." },
});

app.set("trust proxy", 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      if (origin && allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    return next();
  }
  if (!origin && process.env.NODE_ENV !== "production") {
    return next();
  }
  return res.status(403).json({ error: "Deze aanvraag is niet toegestaan." });
});
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);
app.use("/api/auth/google", authLimiter);
app.use("/api/auth/username", writeLimiter);
app.use("/api/editors/invites", writeLimiter);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "leviaan-campus" });
});

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/editors", editorRoutes);
app.use("/api/stats", statsRoutes);

app.use((error, _req, res, _next) => {
  if (error?.type === "entity.parse.failed" || error?.status === 400) {
    return res.status(400).json({ error: "Deze aanvraag is ongeldig." });
  }
  console.error(error);
  res.status(500).json({ error: "Er ging iets mis. Probeer het later opnieuw." });
});

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  if (process.env.NODE_ENV === "production" && !process.env.FRONTEND_URL) {
    throw new Error("FRONTEND_URL is required in production");
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
