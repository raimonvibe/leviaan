import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool, types } = pg;

types.setTypeParser(1082, (value) => value);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

// TLS is configured explicitly below. Drop SSL parameters from the URL (e.g. Neon's
// `?sslmode=require`): pg lets them override the `ssl` option, and from pg v9 `require`
// stops verifying the server certificate. This also silences pg's sslmode warning.
const connectionString = stripSslParams(process.env.DATABASE_URL);

function stripSslParams(url) {
  try {
    const parsed = new URL(url);
    for (const key of ["sslmode", "uselibpqcompat", "ssl"]) {
      parsed.searchParams.delete(key);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: true },
  max: 10,
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function initSchema() {
  const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  await pool.query(sql);
}
