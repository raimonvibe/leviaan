import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireUsername } from "../middleware/auth.js";
import { isEditorRole } from "../publicUser.js";

const router = Router();

function creatorEmail() {
  return String(process.env.CREATOR_EMAIL || "").trim().toLowerCase();
}

const begeleiderFilter = `
  COALESCE(base_role, role) = 'editor'
  AND username IS NOT NULL
  AND lower(email) <> $1
`;

const bewonerFilter = `
  COALESCE(base_role, role) = 'visitor'
  AND username IS NOT NULL
  AND lower(email) <> $1
`;

router.get("/", requireAuth, requireUsername, async (req, res) => {
  const ownerEmail = creatorEmail();
  const counts = [
    query("SELECT COUNT(*)::int AS count FROM posts WHERE deleted_at IS NULL"),
    query(
      "SELECT COUNT(*)::int AS count FROM posts WHERE deleted_at IS NULL AND COALESCE(activity_end_date, activity_date) >= CURRENT_DATE",
    ),
    query(`SELECT COUNT(*)::int AS count FROM users WHERE ${begeleiderFilter}`, [ownerEmail]),
  ];
  if (isEditorRole(req.user.role)) {
    counts.push(query("SELECT COUNT(*)::int AS count FROM posts WHERE deleted_at IS NOT NULL"));
    counts.push(query(`SELECT COUNT(*)::int AS count FROM users WHERE ${bewonerFilter}`, [ownerEmail]));
  }

  const [posts, upcoming, editors, trash, visitors] = await Promise.all(counts);

  res.json({
    totalPosts: posts.rows[0].count,
    upcomingPosts: upcoming.rows[0].count,
    editors: editors.rows[0].count,
    ...(isEditorRole(req.user.role)
      ? { trash: trash.rows[0].count, visitors: visitors.rows[0].count }
      : {}),
  });
});

router.get("/editors", requireAuth, requireUsername, async (_req, res) => {
  const result = await query(
    `SELECT username
     FROM users
     WHERE ${begeleiderFilter}
     ORDER BY lower(username)`,
    [creatorEmail()],
  );
  res.json({
    editors: result.rows.map((row) => ({ username: row.username })),
  });
});

router.get("/visitors", requireAuth, requireUsername, async (req, res) => {
  if (!isEditorRole(req.user.role)) {
    return res.status(403).json({ error: "Alleen begeleiders zien deze namen." });
  }

  const result = await query(
    `SELECT username
     FROM users
     WHERE ${bewonerFilter}
     ORDER BY lower(username)`,
    [creatorEmail()],
  );
  res.json({
    visitors: result.rows.map((row) => ({ username: row.username })),
  });
});

export default router;
