import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireEditor, requireUsername } from "../middleware/auth.js";
import { toPublicUser } from "../publicUser.js";

const router = Router();
const MAX_IMAGE_CHARS = 1_800_000;

function mapPost(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    activityDate: row.activity_date,
    imageData: row.image_data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: toPublicUser({
      id: row.author_id,
      username: row.author_username,
      role: row.author_role,
    }),
  };
}

function validatePost({ title, body, activityDate, imageData, requireImage }) {
  const cleanTitle = String(title || "").trim();
  const cleanBody = String(body || "").trim();
  const cleanDate = String(activityDate || "").trim();
  const cleanImage = imageData == null || imageData === "" ? null : String(imageData);

  if (cleanTitle.length < 2 || cleanTitle.length > 160) {
    return { error: "Geef een titel van 2 tot 160 tekens." };
  }
  if (cleanBody.length < 2 || cleanBody.length > 4000) {
    return { error: "De tekst moet tussen 2 en 4000 tekens zijn." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    return { error: "Kies een geldige datum." };
  }
  if (requireImage && !cleanImage) {
    return { error: "Voeg een afbeelding toe." };
  }
  if (cleanImage) {
    if (!cleanImage.startsWith("data:image/")) {
      return { error: "De afbeelding is geen geldig bestand." };
    }
    if (cleanImage.length > MAX_IMAGE_CHARS) {
      return { error: "De afbeelding is te groot. Kies een kleinere foto." };
    }
  }

  return {
    title: cleanTitle,
    body: cleanBody,
    activityDate: cleanDate,
    imageData: cleanImage,
  };
}

const postSelect = `
  SELECT
    p.id,
    p.title,
    p.body,
    p.activity_date,
    p.image_data,
    p.author_id,
    p.created_at,
    p.updated_at,
    u.username AS author_username,
    u.role AS author_role
  FROM posts p
  JOIN users u ON u.id = p.author_id
`;

router.get("/", requireAuth, requireUsername, async (_req, res) => {
  const result = await query(`${postSelect} ORDER BY p.activity_date DESC, p.created_at DESC`);
  res.json({ posts: result.rows.map(mapPost) });
});

router.get("/:id", requireAuth, requireUsername, async (req, res) => {
  const result = await query(`${postSelect} WHERE p.id = $1`, [req.params.id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Dit bericht bestaat niet." });
  }
  res.json({ post: mapPost(result.rows[0]) });
});

router.post("/", requireAuth, requireUsername, requireEditor, async (req, res) => {
  const parsed = validatePost({ ...req.body, requireImage: true });
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  const result = await query(
    `INSERT INTO posts (title, body, activity_date, image_data, author_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [parsed.title, parsed.body, parsed.activityDate, parsed.imageData, req.user.id],
  );

  const created = await query(`${postSelect} WHERE p.id = $1`, [result.rows[0].id]);
  res.status(201).json({ post: mapPost(created.rows[0]) });
});

router.put("/:id", requireAuth, requireUsername, requireEditor, async (req, res) => {
  const existing = await query("SELECT id, image_data FROM posts WHERE id = $1", [req.params.id]);
  if (existing.rowCount === 0) {
    return res.status(404).json({ error: "Dit bericht bestaat niet." });
  }

  const parsed = validatePost({
    ...req.body,
    imageData: req.body.imageData === undefined ? existing.rows[0].image_data : req.body.imageData,
    requireImage: false,
  });
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  await query(
    `UPDATE posts
     SET title = $1, body = $2, activity_date = $3, image_data = $4
     WHERE id = $5`,
    [parsed.title, parsed.body, parsed.activityDate, parsed.imageData, req.params.id],
  );

  const updated = await query(`${postSelect} WHERE p.id = $1`, [req.params.id]);
  res.json({ post: mapPost(updated.rows[0]) });
});

router.delete("/:id", requireAuth, requireUsername, requireEditor, async (req, res) => {
  const result = await query("DELETE FROM posts WHERE id = $1 RETURNING id", [req.params.id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Dit bericht bestaat niet." });
  }
  res.json({ ok: true });
});

export default router;
