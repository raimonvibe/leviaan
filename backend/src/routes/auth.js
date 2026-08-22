import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { query } from "../db.js";
import { currentUserPayload, requireAuth, signToken } from "../middleware/auth.js";

const router = Router();

function googleClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is required");
  }
  return new OAuth2Client(clientId);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function creatorEmail() {
  return normalizeEmail(process.env.CREATOR_EMAIL);
}

function usernameFromGoogle(payload) {
  const raw = payload.name || payload.given_name || "";
  return raw.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24) || null;
}

async function resolveRole(email) {
  if (email && email === creatorEmail()) {
    return "creator";
  }

  const invite = await query("SELECT id FROM editor_invites WHERE email = $1", [email]);
  if (invite.rowCount > 0) {
    return "editor";
  }

  return "visitor";
}

router.post("/google", async (req, res) => {
  try {
    const credential = req.body?.credential;
    if (!credential) {
      return res.status(400).json({ error: "Google-inlog ontbreekt." });
    }

    const ticket = await googleClient().verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const googleId = payload?.sub;
    const email = normalizeEmail(payload?.email);

    if (!googleId || !email || !payload.email_verified) {
      return res.status(401).json({ error: "Google kon dit account niet bevestigen." });
    }

    const existing = await query(
      "SELECT id, google_id, email, username, role FROM users WHERE google_id = $1 OR email = $2",
      [googleId, email],
    );

    let user = existing.rows[0];

    if (!user) {
      const role = await resolveRole(email);
      const created = await query(
        `INSERT INTO users (google_id, email, username, role)
         VALUES ($1, $2, NULL, $3)
         RETURNING id, google_id, email, username, role`,
        [googleId, email, role],
      );
      user = created.rows[0];
    } else {
      const nextRole = user.role === "creator" ? "creator" : await resolveRole(email);
      if (nextRole !== user.role && user.role !== "creator") {
        const updated = await query(
          "UPDATE users SET role = $1, google_id = $2 WHERE id = $3 RETURNING id, google_id, email, username, role",
          [nextRole, googleId, user.id],
        );
        user = updated.rows[0];
      }
    }

    if (user.role === "editor" || user.role === "creator") {
      await query("DELETE FROM editor_invites WHERE email = $1", [email]);
    }

    const token = signToken(user);
    return res.json({
      token,
      user: currentUserPayload(user),
      suggestedUsername: !user.username ? usernameFromGoogle(payload) : null,
    });
  } catch (error) {
    console.error("Google login failed:", error);
    return res.status(401).json({ error: "Inloggen met Google is niet gelukt." });
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: currentUserPayload(req.user) });
});

router.post("/username", requireAuth, async (req, res) => {
  const username = String(req.body?.username || "").trim();

  if (req.user.username) {
    return res.status(400).json({ error: "Je gebruikersnaam staat al vast." });
  }

  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    return res.status(400).json({
      error: "Kies 3 tot 24 tekens: letters, cijfers of een underscore.",
    });
  }

  const taken = await query(
    "SELECT id FROM users WHERE lower(username) = lower($1)",
    [username],
  );
  if (taken.rowCount > 0) {
    return res.status(409).json({ error: "Deze gebruikersnaam is al in gebruik." });
  }

  const updated = await query(
    "UPDATE users SET username = $1 WHERE id = $2 RETURNING id, email, username, role",
    [username, req.user.id],
  );

  res.json({ user: currentUserPayload(updated.rows[0]) });
});

export default router;
