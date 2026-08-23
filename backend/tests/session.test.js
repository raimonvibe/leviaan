// The session must live on the server side of the cookie. The page should never
// hold anything it could store, replay or leak.
import assert from "node:assert/strict";
import test, { describe } from "node:test";
import jwt from "jsonwebtoken";
import { addToHouseList, findUserByEmail, query } from "./helpers/db.js";
import { googleCredential } from "./helpers/google.js";
import { signInAs, TEST_ENV, useHarness } from "./helpers/harness.js";
import { SESSION_COOKIE, sessionCookieFrom } from "./helpers/server.js";

const context = useHarness();

const TOKEN_ISH = /^(token|access_?token|id_?token|jwt|credential|session|secret|bearer)$/i;

/** Walk the whole answer looking for anything a page could keep and replay. */
function findTokenish(value, path = "body") {
  if (value === null || typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value)) {
    if (TOKEN_ISH.test(key)) return `${path}.${key}`;
    const deeper = findTokenish(child, `${path}.${key}`);
    if (deeper) return deeper;
  }
  return null;
}

describe("the session", () => {
  test("logging in hands the page nothing it could store", async () => {
    await addToHouseList("sessie@example.test", "editor");
    const client = context.client();

    const response = await client.post("/api/auth/google", {
      credential: googleCredential({ email: "sessie@example.test" }),
    });

    assert.equal(response.status, 200);
    assert.equal(findTokenish(response.body), null, "the answer carried a token-shaped field");

    const token = decodeURIComponent(client.sessionCookie);
    assert.ok(token, "no session cookie was set");
    assert.ok(!response.text.includes(token), "the session token was echoed into the body");
  });

  test("the session cookie is one the page cannot read", async () => {
    await addToHouseList("cookie@example.test", "editor");

    const response = await context.client().post("/api/auth/google", {
      credential: googleCredential({ email: "cookie@example.test" }),
    });

    const cookie = sessionCookieFrom(response);
    assert.ok(cookie, "no session cookie was set");
    assert.match(cookie, /HttpOnly/i, "the cookie is readable from JavaScript");
    assert.match(cookie, /Secure/i);
    assert.match(cookie, /SameSite=None/i);
    assert.match(cookie, /Path=\//i);
  });

  test("later calls ride on the cookie", async () => {
    const { client, user } = await signInAs(context, { role: "editor" });

    const me = await client.get("/api/auth/me");

    assert.equal(me.status, 200);
    assert.equal(me.body.user.id, user.id);
  });

  test("an Authorization header on its own is not a session", async () => {
    const { client } = await signInAs(context, { role: "editor" });
    const token = decodeURIComponent(client.sessionCookie);

    const bare = context.client();
    const me = await bare.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });

    assert.equal(me.status, 401);
  });

  test("logging out takes the cookie away and shuts the protected routes", async () => {
    const { client } = await signInAs(context, { role: "editor" });
    assert.equal((await client.get("/api/auth/me")).status, 200);

    const out = await client.post("/api/auth/logout");
    assert.equal(out.status, 200);
    assert.equal(client.sessionCookie, null, "the browser kept the session cookie");
    assert.ok(
      out.setCookies.some((line) => line.startsWith(`${SESSION_COOKIE}=`) && /Max-Age=0/i.test(line)),
      "logout did not clear the cookie",
    );

    assert.equal((await client.get("/api/auth/me")).status, 401);
    assert.equal((await client.get("/api/posts")).status, 401);
    assert.equal((await client.get("/api/stats")).status, 401);
    assert.equal((await client.get("/api/editors")).status, 401);
  });

  test("no cookie means no answer from the protected routes", async () => {
    const client = context.client();

    for (const path of ["/api/auth/me", "/api/posts", "/api/posts/trash", "/api/editors", "/api/stats"]) {
      const response = await client.get(path);
      assert.equal(response.status, 401, `${path} answered without a session`);
    }
  });

  test("a session token somebody tampered with is refused", async () => {
    const { client } = await signInAs(context, { role: "editor" });
    const token = decodeURIComponent(client.sessionCookie);

    const [header, payload, signature] = token.split(".");
    const swapped = `${header}.${Buffer.from(
      JSON.stringify({ sub: 999, role: "creator" }),
    ).toString("base64url")}.${signature}`;

    const forged = context.client();
    forged.cookies.set(SESSION_COOKIE, encodeURIComponent(swapped));

    assert.equal((await forged.get("/api/auth/me")).status, 401);
    assert.ok(payload, "the token did not have the expected three parts");
  });

  test("a session token signed with another secret is refused", async () => {
    const { user } = await signInAs(context, { role: "editor" });
    const outsider = jwt.sign({ sub: user.id, role: "creator" }, "a-different-secret-of-the-right-length!!", {
      algorithm: "HS256",
      expiresIn: "14d",
    });

    const client = context.client();
    client.cookies.set(SESSION_COOKIE, encodeURIComponent(outsider));

    assert.equal((await client.get("/api/auth/me")).status, 401);
  });

  test("an unsigned session token is refused", async () => {
    const { user } = await signInAs(context, { role: "editor" });
    const none = `${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")}.${Buffer.from(
      JSON.stringify({ sub: user.id, role: "creator" }),
    ).toString("base64url")}.`;

    const client = context.client();
    client.cookies.set(SESSION_COOKIE, encodeURIComponent(none));

    assert.equal((await client.get("/api/auth/me")).status, 401);
  });

  test("an expired session is refused", async () => {
    const { user } = await signInAs(context, { role: "editor" });
    const stale = jwt.sign({ sub: user.id, role: "editor" }, TEST_ENV.jwtSecret, {
      algorithm: "HS256",
      expiresIn: "-1h",
    });

    const client = context.client();
    client.cookies.set(SESSION_COOKIE, encodeURIComponent(stale));

    assert.equal((await client.get("/api/auth/me")).status, 401);
  });

  test("a session for somebody who is gone from the board is refused", async () => {
    const { client, email } = await signInAs(context, { role: "editor" });
    assert.equal((await client.get("/api/auth/me")).status, 200);

    const user = await findUserByEmail(email);
    await query("DELETE FROM users WHERE id = $1", [user.id]);

    assert.equal((await client.get("/api/auth/me")).status, 401);
    assert.equal((await client.get("/api/posts")).status, 401);
  });

  test("the role in the cookie is ignored: the board decides", async () => {
    const bewoner = await signInAs(context, { role: "visitor" });

    // Even a correctly signed token claiming a higher role gets nowhere,
    // because the server reads the role from the users table.
    const boastful = jwt.sign({ sub: bewoner.user.id, role: "creator" }, TEST_ENV.jwtSecret, {
      algorithm: "HS256",
      expiresIn: "14d",
    });

    const client = context.client();
    client.cookies.set(SESSION_COOKIE, encodeURIComponent(boastful));

    const me = await client.get("/api/auth/me");
    assert.equal(me.status, 200);
    assert.equal(me.body.user.role, "visitor", "the role from the cookie was believed");

    const posted = await client.post("/api/posts", {
      title: "Stiekem bericht",
      body: "Dit hoort niet te lukken.",
      activityDate: "2030-01-01",
    });
    assert.equal(posted.status, 403);

    assert.equal((await client.get("/api/editors")).status, 403);
  });

  test("signing in again replaces the session instead of stacking cookies", async () => {
    await addToHouseList("opnieuw@example.test", "editor");
    const client = context.client();

    const first = await client.post("/api/auth/google", {
      credential: googleCredential({ email: "opnieuw@example.test", sub: "google-opnieuw" }),
    });
    assert.equal(first.status, 200);

    const second = await client.post("/api/auth/google", {
      credential: googleCredential({ email: "opnieuw@example.test", sub: "google-opnieuw" }),
    });
    assert.equal(second.status, 200);

    const sessionCookies = [...client.cookies.keys()].filter((name) => name === SESSION_COOKIE);
    assert.equal(sessionCookies.length, 1);
    assert.equal((await client.get("/api/auth/me")).status, 200);
  });

  test("someone without a username can be seen but cannot use the board", async () => {
    await addToHouseList("naamloos@example.test", "editor");
    const client = context.client();

    const login = await client.post("/api/auth/google", {
      credential: googleCredential({ email: "naamloos@example.test" }),
    });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.needsUsername, true);

    const posts = await client.get("/api/posts");
    assert.equal(posts.status, 403);
    assert.equal(posts.body.needsUsername, true);
  });
});
