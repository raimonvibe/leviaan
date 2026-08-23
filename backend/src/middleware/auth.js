import jwt from "jsonwebtoken";
import { query } from "../db.js";
import { logWarn } from "../log.js";
import { isEditorRole, toPrivateUser } from "../publicUser.js";
import { readSessionTokens } from "../session.js";

function requestPath(req) {
  return String(req.originalUrl || req.path || "").split("?")[0];
}

function isQuietAuthCheck(req) {
  return requestPath(req) === "/api/auth/me";
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "14d", algorithm: "HS256" },
  );
}

export async function requireAuth(req, res, next) {
  const tokens = readSessionTokens(req);

  if (tokens.length === 0) {
    if (!isQuietAuthCheck(req)) {
      logWarn("auth.session", { outcome: "missing", method: req.method, path: requestPath(req) });
    }
    return res.status(401).json({ error: "Je bent niet ingelogd." });
  }

  let outcome = "invalid";
  for (const token of [...tokens].reverse()) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
      const result = await query(
        "SELECT id, google_id, email, username, role, base_role, created_at FROM users WHERE id = $1",
        [payload.sub],
      );
      const user = result.rows[0];
      if (!user) {
        outcome = "unknown_user";
        continue;
      }
      req.user = user;
      return next();
    } catch {
      outcome = "invalid";
    }
  }

  logWarn("auth.session", { outcome, method: req.method, path: requestPath(req) });
  return res.status(401).json({ error: "Sessie is niet meer geldig." });
}

export function requireUsername(req, res, next) {
  if (!req.user.username) {
    return res.status(403).json({ error: "Kies eerst een gebruikersnaam.", needsUsername: true });
  }
  next();
}

export function requireEditor(req, res, next) {
  if (!isEditorRole(req.user.role)) {
    return res.status(403).json({
      error: "Bewoners mogen dit niet. Alleen begeleiders en de beheerder kunnen dit doen.",
    });
  }
  next();
}

export function requireCreator(req, res, next) {
  if (req.user.role !== "creator") {
    return res.status(403).json({ error: "Alleen de beheerder kan dit doen." });
  }
  next();
}

export function currentUserPayload(user) {
  return toPrivateUser(user);
}
