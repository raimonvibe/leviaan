// What comes in from outside: the shape of it, and where it came from.
import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { findInvite, query } from "./helpers/db.js";
import { signInAs, TEST_ENV, useHarness } from "./helpers/harness.js";

const context = useHarness();

const A_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function newPost(overrides = {}) {
  return {
    title: "Samen koken",
    body: "We koken om zes uur.",
    activityDate: "2030-03-01",
    ...overrides,
  };
}

/** A refusal should say what is wrong, not how the server is built. */
function assertNoInnards(response) {
  assert.doesNotMatch(response.text, /\bat \w+.*\(.*:\d+:\d+\)/, "a stack trace leaked");
  assert.doesNotMatch(response.text, /SyntaxError|TypeError|node_modules|node:internal/, "internals leaked");
  assert.doesNotMatch(response.text, /(?<!\w)(postgres|pg_|relation ".*" does not exist)/i, "database detail leaked");
}

describe("what comes in", () => {
  test("an address that is not an address is not put on the list", async () => {
    const begeleider = await signInAs(context, { role: "editor" });

    for (const email of [
      "geen-adres",
      "twee@@example.test",
      "spaties in@example.test",
      "@example.test",
      "iemand@",
      "",
      null,
      12345,
      { email: "iemand@example.test" },
      `${"x".repeat(250)}@example.test`,
    ]) {
      const response = await begeleider.client.post("/api/editors/invites", { email, role: "editor" });
      assert.equal(response.status, 400, `${JSON.stringify(email)} was accepted`);
    }

    const invites = await query("SELECT COUNT(*)::int AS count FROM editor_invites");
    assert.equal(invites.rows[0].count, 0);
  });

  test("an address is put on the list in lower case, so capitals cannot slip past", async () => {
    const begeleider = await signInAs(context, { role: "editor" });

    const response = await begeleider.client.post("/api/editors/invites", {
      email: "  Nieuwe.Bewoner@Example.Test  ",
      role: "visitor",
    });

    assert.equal(response.status, 201);
    assert.equal((await findInvite("nieuwe.bewoner@example.test")).email, "nieuwe.bewoner@example.test");
  });

  test("only bewoner and begeleider can be handed out", async () => {
    const begeleider = await signInAs(context, { role: "editor" });

    const madeUp = ["creator", "admin", "owner", "beheerder", "editor ", "EDITOR", 1, true];
    for (const [index, role] of madeUp.entries()) {
      const response = await begeleider.client.post("/api/editors/invites", {
        email: `verzonnen${index}@example.test`,
        role,
      });
      assert.equal(response.status, 400, `role ${JSON.stringify(role)} was accepted`);
      assert.equal(await findInvite(`verzonnen${index}@example.test`), null);
    }
  });

  test("leaving the role out means begeleider, never beheerder", async () => {
    const begeleider = await signInAs(context, { role: "editor" });

    for (const [index, body] of [
      { email: "zonderrol0@example.test" },
      { email: "zonderrol1@example.test", role: "" },
      { email: "zonderrol2@example.test", role: null },
    ].entries()) {
      const response = await begeleider.client.post("/api/editors/invites", body);
      assert.equal(response.status, 201);
      assert.equal((await findInvite(`zonderrol${index}@example.test`)).role, "editor");
    }
  });

  test("a post needs a real title, text within bounds and two dates", async () => {
    const begeleider = await signInAs(context, { role: "editor" });

    const wrong = [
      newPost({ title: "" }),
      newPost({ title: "a" }),
      newPost({ title: " ".repeat(20) }),
      newPost({ title: "x".repeat(161) }),
      newPost({ body: "x".repeat(4001) }),
      newPost({ activityDate: "01-03-2030" }),
      newPost({ activityDate: "2030-3-1" }),
      newPost({ activityDate: "morgen" }),
      newPost({ activityDate: "" }),
      newPost({ activityDate: "2030-03-05", activityEndDate: "2030-03-01" }),
    ];

    for (const body of wrong) {
      const response = await begeleider.client.post("/api/posts", body);
      assert.equal(response.status, 400, `${JSON.stringify(body).slice(0, 80)} was accepted`);
      assertNoInnards(response);
    }

    const posts = await query("SELECT COUNT(*)::int AS count FROM posts");
    assert.equal(posts.rows[0].count, 0);
  });

  test("only a plain photo is kept", async () => {
    const begeleider = await signInAs(context, { role: "editor" });

    const wrong = [
      "data:image/svg+xml;base64,PHN2Zy8+",
      "data:image/svg+xml,<svg onload=alert(1)></svg>",
      "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
      "javascript:alert(1)",
      "https://example.test/plaatje.png",
      "<script>alert(1)</script>",
      `data:image/png;base64,${"A".repeat(1_900_000)}`,
    ];

    for (const imageData of wrong) {
      const response = await begeleider.client.post("/api/posts", newPost({ imageData }));
      assert.equal(response.status, 400, `${imageData.slice(0, 40)} was accepted`);
    }

    const good = await begeleider.client.post("/api/posts", newPost({ imageData: A_PIXEL }));
    assert.equal(good.status, 201);
  });

  test("control characters are stripped instead of stored", async () => {
    const begeleider = await signInAs(context, { role: "editor" });

    const response = await begeleider.client.post(
      "/api/posts",
      newPost({
        title: "Sam\u0000en\u0007 koken",
        body: "Regel\u001Ftekst\u007F",
      }),
    );

    assert.equal(response.status, 201);
    assert.equal(response.body.post.title, "Samen koken");
    assert.equal(response.body.post.body, "Regeltekst");
    assert.doesNotMatch(
      `${response.body.post.title}${response.body.post.body}`,
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/,
      "a control character was stored",
    );
  });

  test("text that looks like a database command is stored as text", async () => {
    const begeleider = await signInAs(context, { role: "editor" });

    const response = await begeleider.client.post(
      "/api/posts",
      newPost({ title: "Robert'); DROP TABLE posts;--" }),
    );

    assert.equal(response.status, 201);
    assert.equal(response.body.post.title, "Robert'); DROP TABLE posts;--");

    const stillThere = await query("SELECT COUNT(*)::int AS count FROM posts");
    assert.equal(stillThere.rows[0].count, 1);
  });

  test("a username follows the rules and cannot be taken twice", async () => {
    const first = await signInAs(context, { role: "editor", username: "Anneke" });

    for (const username of ["ab", "x".repeat(25), "met spatie", "met-streep", "emoji🙂", "", null, 42]) {
      const response = await first.client.post("/api/auth/username", { username });
      assert.equal(response.status, 400, `${JSON.stringify(username)} was accepted`);
    }

    const second = await signInAs(context, { role: "visitor", username: null });
    const taken = await second.client.post("/api/auth/username", { username: "anneke" });
    assert.equal(taken.status, 409);
  });

  test("a call from another website is refused", async () => {
    const begeleider = await signInAs(context, { role: "editor" });

    for (const origin of [
      "https://kwaadaardig.example",
      "http://localhost:5174",
      "http://localhost:5173.evil.example",
      "null",
    ]) {
      const response = await begeleider.client.post("/api/posts", newPost(), { origin });
      assert.equal(response.status, 403, `${origin} was allowed to post`);
      assert.match(response.body.error, /niet toegestaan/i);
      assert.notEqual(
        response.headers.get("access-control-allow-origin"),
        origin,
        `${origin} was told it may read the answer`,
      );
    }

    const posts = await query("SELECT COUNT(*)::int AS count FROM posts");
    assert.equal(posts.rows[0].count, 0);
  });

  test("every route that changes something checks where the call came from", async () => {
    const begeleider = await signInAs(context, { role: "editor" });
    const created = await begeleider.client.post("/api/posts", newPost());
    const postId = created.body.post.id;
    const evil = "https://kwaadaardig.example";

    const calls = [
      () => begeleider.client.post("/api/auth/google", { credential: "x" }, { origin: evil }),
      () => begeleider.client.post("/api/auth/username", { username: "nieuwenaam" }, { origin: evil }),
      () => begeleider.client.patch("/api/auth/role", { role: "visitor" }, { origin: evil }),
      () => begeleider.client.post("/api/auth/logout", {}, { origin: evil }),
      () => begeleider.client.put(`/api/posts/${postId}`, newPost({ title: "Gekaapt" }), { origin: evil }),
      () => begeleider.client.delete(`/api/posts/${postId}`, { origin: evil }),
      () => begeleider.client.post(`/api/posts/${postId}/attend`, {}, { origin: evil }),
      () =>
        begeleider.client.post("/api/editors/invites", { email: "kaper@example.test" }, { origin: evil }),
      () => begeleider.client.delete("/api/editors/1", { origin: evil }),
    ];

    for (const call of calls) {
      const response = await call();
      assert.equal(response.status, 403);
    }

    const unchanged = await begeleider.client.get(`/api/posts/${postId}`);
    assert.equal(unchanged.body.post.title, "Samen koken");
  });

  test("in production a call with no Origin at all is refused", async () => {
    const begeleider = await signInAs(context, { role: "editor" });
    const before = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const response = await begeleider.client.post("/api/posts", newPost(), { origin: null });
      assert.equal(response.status, 403);
    } finally {
      process.env.NODE_ENV = before;
    }
  });

  test("our own site is let through", async () => {
    const begeleider = await signInAs(context, { role: "editor" });

    const response = await begeleider.client.post("/api/posts", newPost(), {
      origin: TEST_ENV.frontendUrl,
    });

    assert.equal(response.status, 201);
    assert.equal(response.headers.get("access-control-allow-origin"), TEST_ENV.frontendUrl);
  });

  test("broken JSON gets a plain answer, not the inside of the server", async () => {
    const begeleider = await signInAs(context, { role: "editor" });

    for (const rawBody of ["{", '{"title": }', "niet eens json", '{"title": "x",}']) {
      const response = await begeleider.client.request("POST", "/api/posts", { rawBody });
      assert.equal(response.status, 400, `${rawBody} was accepted`);
      assert.match(response.body.error, /ongeldig/i);
      assertNoInnards(response);
    }
  });

  test("a body that is far too big is refused without spilling anything", async () => {
    const begeleider = await signInAs(context, { role: "editor" });

    const response = await begeleider.client.request("POST", "/api/posts", {
      rawBody: JSON.stringify({ title: "x".repeat(3_000_000) }),
    });

    assert.ok(response.status >= 400, "an oversized body was accepted");
    assertNoInnards(response);
  });

  test("a route that does not exist says so without a stack trace", async () => {
    const begeleider = await signInAs(context, { role: "editor" });

    const response = await begeleider.client.get("/api/bestaat-niet");

    assert.equal(response.status, 404);
    assertNoInnards(response);
  });

  test("an id that is not a number does not reach the database", async () => {
    const begeleider = await signInAs(context, { role: "editor" });

    for (const id of ["nul", "-1", "0", "1;DROP", "1e9999", "%20", "null"]) {
      const response = await begeleider.client.get(`/api/posts/${encodeURIComponent(id)}`);
      assert.equal(response.status, 404, `id ${id} was looked up`);
      assertNoInnards(response);
    }
  });
});
