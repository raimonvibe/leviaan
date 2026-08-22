import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireEditor, requireUsername } from "../middleware/auth.js";
import { isEditorRole, toPublicUser } from "../publicUser.js";

const router = Router();
const MAX_IMAGE_CHARS = 1_800_000;

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
  if (isEditorRole(user.role)) {
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
  }

  return rows.map((row) => {
    const post = mapPost(row, {
      attending: mineSet.has(row.id),
      attendeeCount: isEditorRole(user.role) ? countMap.get(row.id) || 0 : undefined,
      attendees: isEditorRole(user.role) ? namesByPost.get(row.id) || [] : undefined,
    });
    if (!isEditorRole(user.role)) {
      post.author = null;
    }
    return post;
  });
}

function validatePost({ title, body, activityDate, activityEndDate, imageData, requireImage }) {
  const cleanTitle = String(title || "").trim();
  const cleanBody = String(body || "").trim();
  const cleanStart = String(activityDate || "").trim();
  const cleanEnd = String(activityEndDate || activityDate || "").trim();
  const cleanImage = imageData == null || imageData === "" ? null : String(imageData);

  if (cleanTitle.length < 2 || cleanTitle.length > 160) {
    return { error: "Geef een titel van 2 tot 160 tekens." };
  }
  if (cleanBody.length < 2 || cleanBody.length > 4000) {
    return { error: "De tekst moet tussen 2 en 4000 tekens zijn." };
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

router.get("/trash", requireAuth, requireUsername, requireEditor, async (req, res) => {
  const result = await query(
    `${postSelect} WHERE p.deleted_at IS NOT NULL ORDER BY p.deleted_at DESC`,
  );
  res.json({ posts: await withAttendance(result.rows, req.user) });
});

router.get("/:id", requireAuth, requireUsername, async (req, res) => {
  const result = await query(`${postSelect} WHERE p.id = $1 AND p.deleted_at IS NULL`, [req.params.id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Dit bericht bestaat niet." });
  }
  const [post] = await withAttendance(result.rows, req.user);
  res.json({ post });
});

router.post("/", requireAuth, requireUsername, requireEditor, async (req, res) => {
  const parsed = validatePost({ ...req.body, requireImage: true });
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
  const existing = await query(
    "SELECT id, image_data FROM posts WHERE id = $1 AND deleted_at IS NULL",
    [req.params.id],
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
    [parsed.title, parsed.body, parsed.activityDate, parsed.activityEndDate, parsed.imageData, req.params.id],
  );

  const updated = await query(`${postSelect} WHERE p.id = $1`, [req.params.id]);
  const [post] = await withAttendance(updated.rows, req.user);
  res.json({ post });
});

router.delete("/:id", requireAuth, requireUsername, requireEditor, async (req, res) => {
  const result = await query(
    `UPDATE posts
     SET deleted_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [req.params.id],
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Dit bericht bestaat niet." });
  }
  res.json({ ok: true, undone: false });
});

router.post("/:id/restore", requireAuth, requireUsername, requireEditor, async (req, res) => {
  const result = await query(
    `UPDATE posts
     SET deleted_at = NULL
     WHERE id = $1 AND deleted_at IS NOT NULL
     RETURNING id`,
    [req.params.id],
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Dit bericht staat niet in de prullenbak." });
  }
  const restored = await query(`${postSelect} WHERE p.id = $1`, [req.params.id]);
  const [post] = await withAttendance(restored.rows, req.user);
  res.json({ post });
});

router.post("/:id/attend", requireAuth, requireUsername, async (req, res) => {
  const existing = await query("SELECT id FROM posts WHERE id = $1 AND deleted_at IS NULL", [req.params.id]);
  if (existing.rowCount === 0) {
    return res.status(404).json({ error: "Dit bericht bestaat niet." });
  }
  await query(
    `INSERT INTO attendances (post_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (post_id, user_id) DO NOTHING`,
    [req.params.id, req.user.id],
  );
  const result = await query(`${postSelect} WHERE p.id = $1`, [req.params.id]);
  const [post] = await withAttendance(result.rows, req.user);
  res.json({ post });
});

router.delete("/:id/attend", requireAuth, requireUsername, async (req, res) => {
  await query("DELETE FROM attendances WHERE post_id = $1 AND user_id = $2", [req.params.id, req.user.id]);
  const result = await query(`${postSelect} WHERE p.id = $1 AND p.deleted_at IS NULL`, [req.params.id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Dit bericht bestaat niet." });
  }
  const [post] = await withAttendance(result.rows, req.user);
  res.json({ post });
});

router.delete("/:id/permanent", requireAuth, requireUsername, requireEditor, async (req, res) => {
  const result = await query(
    "DELETE FROM posts WHERE id = $1 AND deleted_at IS NOT NULL RETURNING id",
    [req.params.id],
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Dit bericht staat niet in de prullenbak." });
  }
  res.json({ ok: true });
});

export default router;
