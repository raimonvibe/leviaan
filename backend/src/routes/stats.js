import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireUsername } from "../middleware/auth.js";
import { isEditorRole } from "../publicUser.js";

const router = Router();

router.get("/", requireAuth, requireUsername, async (req, res) => {
  const counts = [
    query("SELECT COUNT(*)::int AS count FROM posts WHERE deleted_at IS NULL"),
    query(
      "SELECT COUNT(*)::int AS count FROM posts WHERE deleted_at IS NULL AND COALESCE(activity_end_date, activity_date) >= CURRENT_DATE",
    ),
    query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'editor' AND username IS NOT NULL"),
  ];
  if (isEditorRole(req.user.role)) {
    counts.push(query("SELECT COUNT(*)::int AS count FROM posts WHERE deleted_at IS NOT NULL"));
  }

  const [posts, upcoming, editors, trash] = await Promise.all(counts);

  res.json({
    totalPosts: posts.rows[0].count,
    upcomingPosts: upcoming.rows[0].count,
    editors: editors.rows[0].count,
    ...(isEditorRole(req.user.role) ? { trash: trash.rows[0].count } : {}),
  });
});

router.get("/editors", requireAuth, requireUsername, async (_req, res) => {
  const result = await query(
    `SELECT username
     FROM users
     WHERE role = 'editor' AND username IS NOT NULL
     ORDER BY lower(username)`,
  );
  res.json({
    editors: result.rows.map((row) => ({ username: row.username })),
  });
});

export default router;
