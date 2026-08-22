import jwt from "jsonwebtoken";
import { query } from "../db.js";
import { isEditorRole, toPrivateUser } from "../publicUser.js";

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "14d", algorithm: "HS256" },
  );
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Je bent niet ingelogd." });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    const result = await query(
      "SELECT id, google_id, email, username, role, base_role, created_at FROM users WHERE id = $1",
      [payload.sub],
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Sessie is niet meer geldig." });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Sessie is niet meer geldig." });
  }
}

export function requireUsername(req, res, next) {
  if (!req.user.username) {
    return res.status(403).json({ error: "Kies eerst een gebruikersnaam.", needsUsername: true });
  }
  next();
}

export function requireEditor(req, res, next) {
  if (!isEditorRole(req.user.role)) {
    return res.status(403).json({ error: "Alleen mensen die mogen plaatsen kunnen dit doen." });
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
