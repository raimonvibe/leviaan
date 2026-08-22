import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { query } from "../db.js";
import { currentUserPayload, requireAuth, requireUsername, signToken } from "../middleware/auth.js";
import { isOwnerEmail } from "../publicUser.js";

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

function isVerifiedEmail(value) {
  return value === true || value === "true";
}

async function payloadFromCredential(credential) {
  const ticket = await googleClient().verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}

async function payloadFromAccessToken(accessToken) {
  if (typeof accessToken !== "string" || accessToken.length < 20 || accessToken.length > 4096) {
    return null;
  }

  const tokenInfoUrl = new URL("https://oauth2.googleapis.com/tokeninfo");
  tokenInfoUrl.searchParams.set("access_token", accessToken);
  const tokenInfoResponse = await fetch(tokenInfoUrl);
  if (!tokenInfoResponse.ok) {
    throw new Error("invalid access token");
  }

  const tokenInfo = await tokenInfoResponse.json();
  const audience = tokenInfo.aud || tokenInfo.azp || tokenInfo.audience;
  if (audience !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error("wrong audience");
  }

  const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userInfoResponse.ok) {
    throw new Error("userinfo failed");
  }

  const userInfo = await userInfoResponse.json();
  return {
    sub: userInfo.sub || tokenInfo.sub || tokenInfo.user_id,
    email: userInfo.email || tokenInfo.email,
    email_verified: userInfo.email_verified ?? tokenInfo.email_verified ?? tokenInfo.verified_email,
    name: userInfo.name,
    given_name: userInfo.given_name,
  };
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
    const accessToken = req.body?.accessToken;
    if (!credential && !accessToken) {
      return res.status(400).json({ error: "Google-inlog ontbreekt." });
    }

    const payload = credential
      ? await payloadFromCredential(credential)
      : await payloadFromAccessToken(accessToken);
    const googleId = payload?.sub;
    const email = normalizeEmail(payload?.email);

    if (!payload || !googleId || !email || !isVerifiedEmail(payload.email_verified)) {
      return res.status(401).json({ error: "Google kon dit account niet bevestigen." });
    }

    const existing = await query(
      "SELECT id, google_id, email, username, role, base_role FROM users WHERE google_id = $1 OR email = $2",
      [googleId, email],
    );

    let user = existing.rows[0];

    if (!user) {
      const role = await resolveRole(email);
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
        nextRole = await resolveRole(email);
        if (nextRole === "editor") {
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
    console.error("Google login failed:", error?.message || "unknown error");
    return res.status(401).json({ error: "Inloggen met Google is niet gelukt." });
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: currentUserPayload(req.user) });
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
    "UPDATE users SET username = $1 WHERE id = $2 RETURNING id, email, username, role, base_role",
    [username, req.user.id],
  );

  res.json({ user: currentUserPayload(updated.rows[0]) });
});

export default router;
