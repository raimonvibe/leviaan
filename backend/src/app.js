import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { logError, logWarn } from "./log.js";
import { allowedOriginsFromEnv } from "./sanitize.js";
import authRoutes from "./routes/auth.js";
import editorRoutes from "./routes/editors.js";
import postRoutes from "./routes/posts.js";
import statsRoutes from "./routes/stats.js";

// The Express app is built here so tests can import it without opening a port.
// main.js does the booting (env checks, schema, listen).
export function createApp({ rateLimits = true } = {}) {
  const app = express();
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
    logWarn("http.origin", { outcome: "denied", origin: String(origin || "").slice(0, 120) });
    return res.status(403).json({ error: "Deze aanvraag is niet toegestaan." });
  });
  if (rateLimits) {
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
  }

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "leviaan-campus" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/posts", postRoutes);
  app.use("/api/editors", editorRoutes);
  app.use("/api/stats", statsRoutes);

  app.use((error, req, res, _next) => {
    if (error?.type === "entity.parse.failed" || error?.status === 400) {
      return res.status(400).json({ error: "Deze aanvraag is ongeldig." });
    }
    logError("http.crash", {
      method: req.method,
      path: req.path,
      err: error?.message,
      code: error?.code,
    });
    res.status(500).json({ error: "Er ging iets mis. Probeer het later opnieuw." });
  });

  return app;
}
