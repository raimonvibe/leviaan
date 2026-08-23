import "./env.js";
import { initSchema, pool, query } from "../../src/db.js";

const TABLES = ["attendances", "posts", "editor_invites", "users"];

export async function prepareDatabase() {
  await initSchema();
}

export async function resetDatabase() {
  await query(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`);
}

export async function closeDatabase() {
  await pool.end();
}

export async function countUsersWithEmail(email) {
  const result = await query("SELECT COUNT(*)::int AS count FROM users WHERE lower(email) = lower($1)", [
    email,
  ]);
  return result.rows[0].count;
}

export async function countUsers() {
  const result = await query("SELECT COUNT(*)::int AS count FROM users");
  return result.rows[0].count;
}

export async function findUserByEmail(email) {
  const result = await query(
    "SELECT id, google_id, email, username, role, base_role FROM users WHERE lower(email) = lower($1)",
    [email],
  );
  return result.rows[0] || null;
}

export async function findInvite(email) {
  const result = await query("SELECT id, email, role FROM editor_invites WHERE lower(email) = lower($1)", [
    email,
  ]);
  return result.rows[0] || null;
}

export async function addToHouseList(email, role = "visitor") {
  const result = await query(
    `INSERT INTO editor_invites (email, role) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
     RETURNING id, email, role`,
    [String(email).toLowerCase(), role],
  );
  return result.rows[0];
}

export async function removeFromHouseList(email) {
  await query("DELETE FROM editor_invites WHERE lower(email) = lower($1)", [email]);
}

export async function deleteUserByEmail(email) {
  await query("DELETE FROM users WHERE lower(email) = lower($1)", [email]);
}

export { query };
