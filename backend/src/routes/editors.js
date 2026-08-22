import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireCreator, requireUsername } from "../middleware/auth.js";
import { toPublicUser } from "../publicUser.js";

const router = Router();

function parseId(value) {
  const id = Number.parseInt(String(value), 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

router.use(requireAuth, requireUsername, requireCreator);

router.get("/", async (_req, res) => {
  const [users, invites] = await Promise.all([
    query(
      `SELECT id, username, role, created_at
       FROM users
       ORDER BY
         CASE role WHEN 'creator' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END,
         username NULLS LAST,
         created_at`,
    ),
    query(
      `SELECT id, email, created_at
       FROM editor_invites
       ORDER BY created_at DESC`,
    ),
  ]);

  res.json({
    users: users.rows.map((row) => ({
      ...toPublicUser(row),
      createdAt: row.created_at,
    })),
    invites: invites.rows.map((row) => ({
      id: row.id,
      email: row.email,
      createdAt: row.created_at,
    })),
  });
});

router.post("/invites", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Vul een geldig e-mailadres in." });
  }

  const existingUser = await query("SELECT id, role, username FROM users WHERE email = $1", [email]);
  if (existingUser.rowCount > 0) {
    const user = existingUser.rows[0];
    if (user.role === "creator") {
      return res.status(400).json({ error: "Dit is het beheerdersaccount." });
    }
    if (user.role === "editor") {
      return res.status(400).json({ error: "Deze persoon mag al plaatsen." });
    }
    await query("UPDATE users SET role = 'editor' WHERE id = $1", [user.id]);
    return res.status(201).json({
      promoted: true,
      user: toPublicUser({ ...user, role: "editor" }),
    });
  }

  try {
    const created = await query(
      `INSERT INTO editor_invites (email, invited_by)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [email, req.user.id],
    );
    res.status(201).json({ invite: created.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "Deze uitnodiging staat al open." });
    }
    throw error;
  }
});

router.delete("/invites/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: "Deze uitnodiging bestaat niet." });
  const result = await query("DELETE FROM editor_invites WHERE id = $1 RETURNING id", [id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Deze uitnodiging bestaat niet." });
  }
  res.json({ ok: true });
});

router.patch("/:id/role", async (req, res) => {
  const role = String(req.body?.role || "");
  if (!["visitor", "editor"].includes(role)) {
    return res.status(400).json({ error: "Kies bewoner of iemand die mag plaatsen." });
  }

  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: "Deze gebruiker bestaat niet." });
  const target = await query("SELECT id, username, role, email FROM users WHERE id = $1", [id]);
  if (target.rowCount === 0) {
    return res.status(404).json({ error: "Deze gebruiker bestaat niet." });
  }
  if (target.rows[0].role === "creator") {
    return res.status(400).json({ error: "De beheerder kan niet worden gewijzigd." });
  }
  if (id === req.user.id && role !== "creator") {
    return res.status(400).json({ error: "Gebruik ‘Test als’ om jezelf tijdelijk te wisselen." });
  }

  const updated = await query(
    "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role",
    [role, id],
  );
  if (role === "visitor" && target.rows[0].email) {
    await query("DELETE FROM editor_invites WHERE email = $1", [target.rows[0].email]);
  }

  res.json({ user: toPublicUser(updated.rows[0]) });
});

export default router;
