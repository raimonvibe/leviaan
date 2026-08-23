import "./env.js";
import assert from "node:assert/strict";
import { after, before, beforeEach } from "node:test";
import { addToHouseList, closeDatabase, prepareDatabase, resetDatabase } from "./db.js";
import { googleCredential, installFakeGoogle, resetFakeGoogle } from "./google.js";
import { startServer } from "./server.js";
import { TEST_ENV } from "./env.js";

export { TEST_ENV };

/**
 * One real server, one throwaway database, one fake Google. Tables are emptied
 * between tests so no test can lean on another one's leftovers.
 */
export function useHarness({ rateLimits = false } = {}) {
  const context = {
    baseUrl: null,
    client: () => context.server.client(),
    server: null,
  };

  before(async () => {
    await prepareDatabase();
    installFakeGoogle();
    context.server = await startServer({ rateLimits });
    context.baseUrl = context.server.baseUrl;
  });

  beforeEach(async () => {
    resetFakeGoogle();
    await resetDatabase();
  });

  after(async () => {
    await context.server?.close();
    await closeDatabase();
  });

  return context;
}

/**
 * Sign somebody in the way the app really does it: put the address on the house
 * list, then come in through /api/auth/google. No shortcut that skips the door.
 *
 * A username is picked as well, because most routes need one. Pass
 * `username: null` for somebody who has not chosen one yet.
 */
export async function signInAs(
  context,
  { role = "visitor", email, username, ...payloadOverrides } = {},
) {
  const isOwner = role === "creator";
  const address = email ?? (isOwner ? TEST_ENV.ownerEmail : `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`);

  if (!isOwner) {
    await addToHouseList(address, role === "editor" ? "editor" : "visitor");
  }

  const client = context.client();
  const credential = googleCredential({ email: address, ...payloadOverrides });
  const response = await client.post("/api/auth/google", { credential });
  assert.equal(response.status, 200, `signInAs(${role}) failed: ${response.text}`);

  let user = response.body.user;

  if (username !== null) {
    const chosen = username ?? `t${Math.random().toString(36).slice(2, 10)}`;
    const named = await client.post("/api/auth/username", { username: chosen });
    assert.equal(named.status, 200, `naming ${role} failed: ${named.text}`);
    user = named.body.user;
  }

  return { client, user, email: address };
}
