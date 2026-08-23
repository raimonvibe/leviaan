import { Router } from "express";
import { query } from "../db.js";
import { verifyGoogleIdToken } from "../googleVerify.js";
import { currentUserPayload, requireAuth, requireUsername, signToken } from "../middleware/auth.js";
import { isOwnerEmail } from "../publicUser.js";
import { logError, logInfo, logWarn } from "../log.js";
import { cleanEmail, stripUnsafe } from "../sanitize.js";
import { clearSessionCookie, setSessionCookie } from "../session.js";

const router = Router();

function creatorEmail() {
  return cleanEmail(process.env.CREATOR_EMAIL);
}

function usernameFromGoogle(payload) {
  const raw = payload.name || payload.given_name || "";
  return raw.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24) || null;
}

function isVerifiedEmail(value) {
  return value === true || value === "true";
}

async function payloadFromCredential(credential) {
  if (typeof credential !== "string" || credential.length < 40 || credential.length > 4096) {
    return null;
  }
  if (credential.split(".").length !== 3) {
    return null;
  }

  const payload = await verifyGoogleIdToken(credential);
  if (!payload) return null;
  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) return null;
  if (payload.iss !== "accounts.google.com" && payload.iss !== "https://accounts.google.com") {
    return null;
  }
  return payload;
}

async function findInvite(email) {
  const invite = await query("SELECT id, role FROM editor_invites WHERE email = $1", [email]);
  return invite.rows[0] || null;
}

async function resolveRole(email) {
  if (email && email === creatorEmail()) {
    return "creator";
  }

  const invite = await findInvite(email);
  if (!invite) {
    return null;
  }

  return invite.role === "editor" ? "editor" : "visitor";
}

router.post("/google", async (req, res) => {
  try {
    const credential = req.body?.credential;
    if (!credential) {
      logWarn("auth.login", { outcome: "denied", reason: "missing_credential" });
      return res.status(400).json({ error: "Google-inlog ontbreekt." });
    }

    const payload = await payloadFromCredential(credential);
    const googleId = payload?.sub;
    const email = cleanEmail(payload?.email);

    if (!payload || !googleId || !email || !isVerifiedEmail(payload.email_verified)) {
      logWarn("auth.login", { outcome: "denied", reason: "google_unverified", email });
      return res.status(401).json({ error: "Google kon dit account niet bevestigen." });
    }

    const existing = await query(
      "SELECT id, google_id, email, username, role, base_role FROM users WHERE google_id = $1 OR email = $2",
      [googleId, email],
    );

    let user = existing.rows[0];

    if (!user) {
      const role = await resolveRole(email);
      if (!role) {
        logWarn("auth.login", { outcome: "denied", reason: "not_on_list", email });
        return res.status(403).json({
          error:
            "Dit e-mailadres staat niet op de lijst van het huis. Vraag een begeleider of de beheerder om je toe te voegen.",
        });
      }
      const created = await query(
        `INSERT INTO users (google_id, email, username, role, base_role)
         VALUES ($1, $2, NULL, $3, $3)
         RETURNING id, google_id, email, username, role, base_role`,
        [googleId, email, role],
      );
      user = created.rows[0];
    } else {
      let nextRole = user.role;
      let nextBaseRole = user.base_role || user.role;
      if (email === creatorEmail()) {
        nextRole = "creator";
        nextBaseRole = "creator";
      } else if (nextBaseRole === "editor") {
        nextRole = "editor";
        nextBaseRole = "editor";
      } else if (user.role === "visitor") {
        const invitedRole = await resolveRole(email);
        if (invitedRole === "editor") {
          nextRole = "editor";
          nextBaseRole = "editor";
        }
      }

      if (nextRole !== user.role || nextBaseRole !== user.base_role || user.google_id !== googleId) {
        const updated = await query(
          `UPDATE users SET role = $1, base_role = $2, google_id = $3
           WHERE id = $4
           RETURNING id, google_id, email, username, role, base_role`,
          [nextRole, nextBaseRole, googleId, user.id],
        );
        user = updated.rows[0];
      }
    }

    await query("DELETE FROM editor_invites WHERE email = $1", [email]);

    setSessionCookie(res, signToken(user));
    logInfo("auth.login", { outcome: "ok", userId: user.id, role: user.role, email });
    return res.json({
      user: currentUserPayload(user),
      suggestedUsername: !user.username ? usernameFromGoogle(payload) : null,
    });
  } catch (error) {
    logError("auth.login", { outcome: "error", reason: "exception", err: error?.message });
    return res.status(401).json({ error: "Inloggen met Google is niet gelukt." });
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: currentUserPayload(req.user) });
});

router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.patch("/role", requireAuth, requireUsername, async (req, res) => {
  const role = String(req.body?.role || "");
  const owner = isOwnerEmail(req.user.email);
  const baseRole = req.user.base_role || req.user.role;
  const allowed = owner ? ["visitor", "editor", "creator"] : baseRole === "editor" ? ["visitor", "editor"] : [];

  if (!allowed.includes(role)) {
    return res.status(403).json({ error: "Je kunt dit niet wisselen." });
  }

  const updated = await query(
    "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, username, role, base_role",
    [role, req.user.id],
  );

  res.json({ user: currentUserPayload(updated.rows[0]) });
});

router.post("/username", requireAuth, async (req, res) => {
  const username = stripUnsafe(String(req.body?.username || "")).trim();

  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    return res.status(400).json({
      error: "Kies 3 tot 24 tekens: letters, cijfers of een underscore.",
    });
  }

  if (req.user.username && req.user.username.toLowerCase() === username.toLowerCase()) {
    return res.json({ user: currentUserPayload(req.user) });
  }

  const taken = await query(
    "SELECT id FROM users WHERE lower(username) = lower($1) AND id <> $2",
    [username, req.user.id],
  );
  if (taken.rowCount > 0) {
    return res.status(409).json({ error: "Deze gebruikersnaam is al in gebruik." });
  }

  const updated = await query(
    "UPDATE users SET username = $1 WHERE id = $2 RETURNING id, email, username, role, base_role",
    [username, req.user.id],
  );

  res.json({ user: currentUserPayload(updated.rows[0]) });
});

export default router;
