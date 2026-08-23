// Loaded first by every helper, before anything reaches src/db.js (which builds
// its pool from DATABASE_URL at import time).
//
// Everything here is dummy. Real secrets never enter the suite.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function readEnvFile(name) {
  const file = path.join(backendDir, name);
  if (!fs.existsSync(file)) return {};
  const values = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const testEnvFile = readEnvFile(".env.test");
const liveEnvFile = readEnvFile(".env");

const testDatabaseUrl = process.env.TEST_DATABASE_URL || testEnvFile.TEST_DATABASE_URL || "";

if (!testDatabaseUrl) {
  throw new Error(
    [
      "TEST_DATABASE_URL is not set, so there is no database to test against.",
      "",
      "Put it in backend/.env.test (git-ignored) or in your shell, for example:",
      "  TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/leviaan_test",
      "",
      "See backend/.env.test.example.",
    ].join("\n"),
  );
}

// Guards. These exist so a tired evening never wipes the house board.
function guardTestDatabase(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("TEST_DATABASE_URL is not a valid connection string.");
  }

  const liveUrl = process.env.DATABASE_URL || liveEnvFile.DATABASE_URL || "";
  if (liveUrl && url === liveUrl) {
    throw new Error("TEST_DATABASE_URL is the live database. Refusing to run.");
  }

  const database = parsed.pathname.replace(/^\//, "");
  if (!/test/i.test(database)) {
    throw new Error(
      `The test database is called "${database}". Its name must contain "test", so a live database cannot be picked by accident.`,
    );
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "postgres", "db"]);
  if (!localHosts.has(parsed.hostname) && process.env.ALLOW_REMOTE_TEST_DB !== "1") {
    throw new Error(
      `The test database is on "${parsed.hostname}", not this machine. Set ALLOW_REMOTE_TEST_DB=1 if that is really what you want.`,
    );
  }
}

guardTestDatabase(testDatabaseUrl);

// Dummy values only. Never the real ones.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = testDatabaseUrl;
process.env.JWT_SECRET = "test-only-secret-not-used-anywhere-real-0123456789";
process.env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
process.env.CREATOR_EMAIL = "beheerder@example.test";
process.env.FRONTEND_URL = "http://localhost:5173";

export const TEST_ENV = {
  ownerEmail: process.env.CREATOR_EMAIL,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  jwtSecret: process.env.JWT_SECRET,
  frontendUrl: process.env.FRONTEND_URL,
  databaseUrl: testDatabaseUrl,
};
