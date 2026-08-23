import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireEditor, requireUsername } from "../middleware/auth.js";
import { toPublicUser } from "../publicUser.js";
import { stripUnsafe } from "../sanitize.js";

const router = Router();
const MAX_IMAGE_CHARS = 1_800_000;
const SAFE_IMAGE = /^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/i;

function parseId(value) {
  const id = Number.parseInt(String(value), 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function mapPost(row, extras = {}) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    activityDate: row.activity_date,
    activityEndDate: row.activity_end_date || row.activity_date,
    imageData: row.image_data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    author: toPublicUser({
      id: row.author_id,
      username: row.author_username,
      role: row.author_role,
    }),
    attending: Boolean(extras.attending),
    attendeeCount: extras.attendeeCount,
    attendees: extras.attendees,
  };
}

async function withAttendance(rows, user) {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const [mine, counts] = await Promise.all([
    query(
      "SELECT post_id FROM attendances WHERE user_id = $1 AND post_id = ANY($2::int[])",
      [user.id, ids],
    ),
    query(
      "SELECT post_id, COUNT(*)::int AS count FROM attendances WHERE post_id = ANY($1::int[]) GROUP BY post_id",
      [ids],
    ),
  ]);
  const mineSet = new Set(mine.rows.map((row) => row.post_id));
  const countMap = new Map(counts.rows.map((row) => [row.post_id, row.count]));

  let namesByPost = new Map();
  const names = await query(
    `SELECT a.post_id, u.username
     FROM attendances a
     JOIN users u ON u.id = a.user_id
     WHERE a.post_id = ANY($1::int[]) AND u.username IS NOT NULL
     ORDER BY lower(u.username)`,
    [ids],
  );
  for (const row of names.rows) {
    const list = namesByPost.get(row.post_id) || [];
    list.push(row.username);
    namesByPost.set(row.post_id, list);
  }

  return rows.map((row) =>
    mapPost(row, {
      attending: mineSet.has(row.id),
      attendeeCount: countMap.get(row.id) || 0,
      attendees: namesByPost.get(row.id) || [],
    }),
  );
}

function validatePost({ title, body, activityDate, activityEndDate, imageData, requireImage }) {
  const cleanTitle = stripUnsafe(title).trim();
  const cleanBody = stripUnsafe(body).trim();
  const cleanStart = stripUnsafe(activityDate).trim();
  const cleanEnd = stripUnsafe(activityEndDate || activityDate).trim();
  const cleanImage = imageData == null || imageData === "" ? null : String(imageData);

  if (cleanTitle.length < 2 || cleanTitle.length > 160) {
    return { error: "Geef een titel van 2 tot 160 tekens." };
  }
  if (cleanBody.length > 4000) {
    return { error: "De tekst mag maximaal 4000 tekens zijn." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanStart) || !/^\d{4}-\d{2}-\d{2}$/.test(cleanEnd)) {
    return { error: "Kies een begindatum en een einddatum." };
  }
  if (cleanEnd < cleanStart) {
    return { error: "De einddatum moet op of na de begindatum liggen." };
  }
  if (requireImage && !cleanImage) {
    return { error: "Voeg een afbeelding toe." };
  }
  if (cleanImage) {
    if (!SAFE_IMAGE.test(cleanImage) || /svg/i.test(cleanImage.slice(0, 40))) {
      return { error: "Kies een gewone foto (JPG, PNG, WebP of GIF)." };
    }
    if (cleanImage.length > MAX_IMAGE_CHARS) {
      return { error: "De foto is te groot. Kies een kleinere foto." };
    }
  }

  return {
    title: cleanTitle,
    body: cleanBody,
    activityDate: cleanStart,
    activityEndDate: cleanEnd,
    imageData: cleanImage,
  };
}

const postSelect = `
  SELECT
    p.id,
    p.title,
    p.body,
    p.activity_date,
    p.activity_end_date,
    p.image_data,
    p.author_id,
    p.created_at,
    p.updated_at,
    p.deleted_at,
    u.username AS author_username,
    u.role AS author_role
  FROM posts p
  JOIN users u ON u.id = p.author_id
`;

router.get("/", requireAuth, requireUsername, async (req, res) => {
  const result = await query(
    `${postSelect} WHERE p.deleted_at IS NULL ORDER BY p.activity_date DESC, p.created_at DESC`,
  );
  res.json({ posts: await withAttendance(result.rows, req.user) });
});

router.delete("/trash", requireAuth, requireUsername, requireEditor, async (req, res) => {
  const result = await query("DELETE FROM posts WHERE deleted_at IS NOT NULL RETURNING id");
  res.json({ ok: true, deleted: result.rowCount });
});

router.get("/trash", requireAuth, requireUsername, requireEditor, async (req, res) => {
  const result = await query(
    `${postSelect} WHERE p.deleted_at IS NOT NULL ORDER BY p.deleted_at DESC`,
  );
  res.json({ posts: await withAttendance(result.rows, req.user) });
});

router.get("/:id", requireAuth, requireUsername, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: "Dit bericht bestaat niet." });
  const result = await query(`${postSelect} WHERE p.id = $1 AND p.deleted_at IS NULL`, [id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Dit bericht bestaat niet." });
  }
  const [post] = await withAttendance(result.rows, req.user);
  res.json({ post });
});

router.post("/", requireAuth, requireUsername, requireEditor, async (req, res) => {
  const parsed = validatePost({ ...req.body, requireImage: false });
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  const result = await query(
    `INSERT INTO posts (title, body, activity_date, activity_end_date, image_data, author_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [parsed.title, parsed.body, parsed.activityDate, parsed.activityEndDate, parsed.imageData, req.user.id],
  );

  const created = await query(`${postSelect} WHERE p.id = $1`, [result.rows[0].id]);
  const [post] = await withAttendance(created.rows, req.user);
  res.status(201).json({ post });
});

router.put("/:id", requireAuth, requireUsername, requireEditor, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: "Dit bericht bestaat niet." });
  const existing = await query(
    "SELECT id, image_data FROM posts WHERE id = $1 AND deleted_at IS NULL",
    [id],
  );
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
     SET title = $1, body = $2, activity_date = $3, activity_end_date = $4, image_data = $5
     WHERE id = $6 AND deleted_at IS NULL`,
    [parsed.title, parsed.body, parsed.activityDate, parsed.activityEndDate, parsed.imageData, id],
  );

  const updated = await query(`${postSelect} WHERE p.id = $1`, [id]);
  const [post] = await withAttendance(updated.rows, req.user);
  res.json({ post });
});

router.delete("/:id", requireAuth, requireUsername, requireEditor, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: "Dit bericht bestaat niet." });
  const result = await query(
    `UPDATE posts
     SET deleted_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [id],
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Dit bericht bestaat niet." });
  }
  res.json({ ok: true, undone: false });
});

router.post("/:id/restore", requireAuth, requireUsername, requireEditor, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: "Dit bericht staat niet in de prullenbak." });
  const result = await query(
    `UPDATE posts
     SET deleted_at = NULL
     WHERE id = $1 AND deleted_at IS NOT NULL
     RETURNING id`,
    [id],
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Dit bericht staat niet in de prullenbak." });
  }
  const restored = await query(`${postSelect} WHERE p.id = $1`, [id]);
  const [post] = await withAttendance(restored.rows, req.user);
  res.json({ post });
});

router.post("/:id/attend", requireAuth, requireUsername, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: "Dit bericht bestaat niet." });
  const existing = await query("SELECT id FROM posts WHERE id = $1 AND deleted_at IS NULL", [id]);
  if (existing.rowCount === 0) {
    return res.status(404).json({ error: "Dit bericht bestaat niet." });
  }
  await query(
    `INSERT INTO attendances (post_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (post_id, user_id) DO NOTHING`,
    [id, req.user.id],
  );
  const result = await query(`${postSelect} WHERE p.id = $1`, [id]);
  const [post] = await withAttendance(result.rows, req.user);
  res.json({ post });
});

router.delete("/:id/attend", requireAuth, requireUsername, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: "Dit bericht bestaat niet." });
  await query("DELETE FROM attendances WHERE post_id = $1 AND user_id = $2", [id, req.user.id]);
  const result = await query(`${postSelect} WHERE p.id = $1 AND p.deleted_at IS NULL`, [id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Dit bericht bestaat niet." });
  }
  const [post] = await withAttendance(result.rows, req.user);
  res.json({ post });
});

router.delete("/:id/permanent", requireAuth, requireUsername, requireEditor, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: "Dit bericht staat niet in de prullenbak." });
  const result = await query(
    "DELETE FROM posts WHERE id = $1 AND deleted_at IS NOT NULL RETURNING id",
    [id],
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Dit bericht staat niet in de prullenbak." });
  }
  res.json({ ok: true });
});

export default router;
