import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireCreator, requireEditor, requireUsername } from "../middleware/auth.js";
import { isOwnerEmail, toPublicUser } from "../publicUser.js";
import { cleanEmail } from "../sanitize.js";

const router = Router();

function parseId(value) {
  const id = Number.parseInt(String(value), 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.use(requireAuth, requireUsername, requireEditor);

router.get("/", async (_req, res) => {
  const [users, invites] = await Promise.all([
    query(
      `SELECT id, username, role, base_role, created_at
       FROM users
       ORDER BY
         CASE COALESCE(base_role, role) WHEN 'creator' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END,
         username NULLS LAST,
         created_at`,
    ),
    query(
      `SELECT id, email, role, created_at
       FROM editor_invites
       ORDER BY created_at DESC`,
    ),
  ]);

  res.json({
    users: users.rows.map((row) => ({
      ...toPublicUser(row),
      baseRole: row.base_role || row.role,
      createdAt: row.created_at,
    })),
    invites: invites.rows.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role === "visitor" ? "visitor" : "editor",
      createdAt: row.created_at,
    })),
  });
});

router.post("/invites", async (req, res) => {
  const email = cleanEmail(req.body?.email);
  const role = String(req.body?.role || "editor");
  if (!email) {
    return res.status(400).json({ error: "Vul een geldig e-mailadres in." });
  }
  if (!["visitor", "editor"].includes(role)) {
    return res.status(400).json({ error: "Kies bewoner of begeleider." });
  }

  const existingUser = await query(
    "SELECT id, role, username, base_role FROM users WHERE email = $1",
    [email],
  );
  if (isOwnerEmail(email)) {
    return res.status(400).json({ error: "Dit is het beheerdersaccount." });
  }

  if (existingUser.rowCount > 0) {
    const user = existingUser.rows[0];
    const actualRole = user.base_role || user.role;
    if (user.role === "creator" || actualRole === "creator") {
      return res.status(400).json({ error: "Dit is het beheerdersaccount." });
    }
    if (actualRole === "editor") {
      return res.status(400).json({ error: "Deze persoon is al begeleider." });
    }
    if (role === "visitor") {
      return res.status(400).json({ error: "Deze persoon is al bewoner." });
    }
    await query("UPDATE users SET role = 'editor', base_role = 'editor' WHERE id = $1", [user.id]);
    await query("DELETE FROM editor_invites WHERE email = $1", [email]);
    return res.status(201).json({
      promoted: true,
      user: toPublicUser({ ...user, role: "editor" }),
    });
  }

  const existingInvite = await query("SELECT id, role FROM editor_invites WHERE email = $1", [email]);
  if (existingInvite.rowCount > 0) {
    const currentRole = existingInvite.rows[0].role === "visitor" ? "visitor" : "editor";
    if (currentRole === role) {
      return res.status(409).json({
        error: role === "editor" ? "Deze uitnodiging staat al open." : "Dit e-mailadres staat al op de lijst.",
      });
    }
    if (currentRole === "editor" && role === "visitor") {
      return res.status(400).json({ error: "Dit adres is al uitgenodigd als begeleider." });
    }
    const upgraded = await query(
      `UPDATE editor_invites SET role = 'editor' WHERE id = $1
       RETURNING id, email, role, created_at`,
      [existingInvite.rows[0].id],
    );
    return res.status(201).json({ upgraded: true, invite: upgraded.rows[0] });
  }

  try {
    const created = await query(
      `INSERT INTO editor_invites (email, invited_by, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role, created_at`,
      [email, req.user.id, role],
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

router.patch("/:id/role", requireCreator, async (req, res) => {
  const role = String(req.body?.role || "");
  if (!["visitor", "editor"].includes(role)) {
    return res.status(400).json({ error: "Kies bewoner of iemand die mag plaatsen." });
  }

  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: "Deze gebruiker bestaat niet." });
  const target = await query("SELECT id, username, role, base_role, email FROM users WHERE id = $1", [id]);
  if (target.rowCount === 0) {
    return res.status(404).json({ error: "Deze gebruiker bestaat niet." });
  }
  if (target.rows[0].role === "creator" || target.rows[0].base_role === "creator") {
    return res.status(400).json({ error: "De beheerder kan niet worden gewijzigd." });
  }
  if (role === "visitor" && (target.rows[0].role === "editor" || target.rows[0].base_role === "editor")) {
    return res.status(400).json({ error: "Een begeleider blijft begeleider." });
  }
  if (id === req.user.id && role !== "creator") {
    return res.status(400).json({ error: "Gebruik ‘Test als’ om jezelf tijdelijk te wisselen." });
  }

  const updated = await query(
    "UPDATE users SET role = $1, base_role = $1 WHERE id = $2 RETURNING id, username, role",
    [role, id],
  );
  if (role === "visitor" && target.rows[0].email) {
    await query("DELETE FROM editor_invites WHERE email = $1", [target.rows[0].email]);
  }

  res.json({ user: toPublicUser(updated.rows[0]) });
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: "Deze gebruiker bestaat niet." });
  if (id === req.user.id) {
    return res.status(400).json({ error: "Je kunt jezelf niet van het bord halen." });
  }

  const target = await query("SELECT id, username, role, base_role, email FROM users WHERE id = $1", [id]);
  if (target.rowCount === 0) {
    return res.status(404).json({ error: "Deze gebruiker bestaat niet." });
  }
  const person = target.rows[0];
  if (person.role === "creator" || person.base_role === "creator" || isOwnerEmail(person.email)) {
    return res.status(400).json({ error: "De beheerder kan niet worden verwijderd." });
  }

  await query(
    `UPDATE posts
     SET author_name = COALESCE(author_name, $1)
     WHERE author_id = $2`,
    [person.username, id],
  );
  if (person.email) {
    await query("DELETE FROM editor_invites WHERE email = $1", [person.email]);
  }
  await query("DELETE FROM users WHERE id = $1", [id]);
  res.json({ ok: true });
});

export default router;
