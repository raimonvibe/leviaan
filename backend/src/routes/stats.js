import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireUsername } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, requireUsername, async (_req, res) => {
  const [posts, upcoming, editors, trash] = await Promise.all([
    query("SELECT COUNT(*)::int AS count FROM posts WHERE deleted_at IS NULL"),
    query(
      "SELECT COUNT(*)::int AS count FROM posts WHERE deleted_at IS NULL AND activity_date >= CURRENT_DATE",
    ),
    query("SELECT COUNT(*)::int AS count FROM users WHERE role IN ('editor', 'creator')"),
    query("SELECT COUNT(*)::int AS count FROM posts WHERE deleted_at IS NOT NULL"),
  ]);

  res.json({
    totalPosts: posts.rows[0].count,
    upcomingPosts: upcoming.rows[0].count,
    editors: editors.rows[0].count,
    trash: trash.rows[0].count,
  });
});

export default router;
