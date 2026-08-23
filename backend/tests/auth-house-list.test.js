// The front door. Every test here answers one question: can somebody who is not
// on the house list get in? A friendly error on screen is not an answer — these
// check the server, the users table and the session cookie.
import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
  addToHouseList,
  countUsers,
  countUsersWithEmail,
  deleteUserByEmail,
  findInvite,
  findUserByEmail,
  removeFromHouseList,
} from "./helpers/db.js";
import {
  emptyPayloadCredential,
  forgedCredential,
  googleCalls,
  googleCredential,
} from "./helpers/google.js";
import { TEST_ENV, useHarness } from "./helpers/harness.js";
import { sessionCookieFrom } from "./helpers/server.js";

const context = useHarness();

/** Nothing got through: refused, no account, no session. */
async function assertDoorStayedShut(response, email) {
  assert.ok(response.status >= 400, `expected a refusal, got ${response.status}`);
  assert.equal(sessionCookieFrom(response), null, "a session cookie was handed out anyway");
  if (email) {
    assert.equal(await countUsersWithEmail(email), 0, "a user row was created anyway");
  }
}

describe("logging in and the house list", () => {
  test("an address that is not on the list is refused, with no account and no session", async () => {
    const client = context.client();
    const email = "vreemde@example.test";

    const response = await client.post("/api/auth/google", {
      credential: googleCredential({ email }),
    });

    assert.equal(response.status, 403);
    await assertDoorStayedShut(response, email);
    assert.equal(await countUsers(), 0);
    assert.equal(client.sessionCookie, null, "the browser kept a session cookie");
  });

  test("someone listed as bewoner may sign in as bewoner, and the invite is used up", async () => {
    await addToHouseList("bewoner@example.test", "visitor");
    const client = context.client();

    const response = await client.post("/api/auth/google", {
      credential: googleCredential({ email: "bewoner@example.test" }),
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.user.role, "visitor");
    assert.equal(response.body.user.baseRole, "visitor");
    assert.equal(response.body.user.isOwner, false);
    assert.equal(await findInvite("bewoner@example.test"), null, "the invite was left lying around");

    const stored = await findUserByEmail("bewoner@example.test");
    assert.equal(stored.role, "visitor");
  });

  test("someone listed as begeleider may sign in as begeleider", async () => {
    await addToHouseList("begeleider@example.test", "editor");
    const client = context.client();

    const response = await client.post("/api/auth/google", {
      credential: googleCredential({ email: "begeleider@example.test" }),
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.user.role, "editor");
    assert.equal(response.body.user.baseRole, "editor");
    assert.equal(await findInvite("begeleider@example.test"), null);
  });

  test("the owner may sign in as beheerder without an invite", async () => {
    const client = context.client();

    const response = await client.post("/api/auth/google", {
      credential: googleCredential({ email: TEST_ENV.ownerEmail }),
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.user.role, "creator");
    assert.equal(response.body.user.isOwner, true);
    assert.equal(await findInvite(TEST_ENV.ownerEmail), null);
  });

  test("the owner address is matched whatever the capitals", async () => {
    const client = context.client();

    const response = await client.post("/api/auth/google", {
      credential: googleCredential({ email: TEST_ENV.ownerEmail.toUpperCase() }),
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.user.role, "creator");
  });

  test("somebody already in users may sign in again after the invite is gone", async () => {
    await addToHouseList("terug@example.test", "visitor");
    const credential = googleCredential({ email: "terug@example.test", sub: "google-terug" });

    const first = await context.client().post("/api/auth/google", { credential });
    assert.equal(first.status, 200);
    assert.equal(await findInvite("terug@example.test"), null);

    const again = googleCredential({ email: "terug@example.test", sub: "google-terug" });
    const second = await context.client().post("/api/auth/google", { credential: again });
    assert.equal(second.status, 200);
    assert.equal(second.body.user.role, "visitor");
    assert.equal(await countUsersWithEmail("terug@example.test"), 1, "a second account was created");
  });

  test("somebody taken off the board cannot sign in until the address is added again", async () => {
    await addToHouseList("vertrokken@example.test", "visitor");
    const first = await context.client().post("/api/auth/google", {
      credential: googleCredential({ email: "vertrokken@example.test" }),
    });
    assert.equal(first.status, 200);

    await deleteUserByEmail("vertrokken@example.test");

    const locked = await context.client().post("/api/auth/google", {
      credential: googleCredential({ email: "vertrokken@example.test" }),
    });
    assert.equal(locked.status, 403);
    await assertDoorStayedShut(locked, "vertrokken@example.test");

    await addToHouseList("vertrokken@example.test", "visitor");
    const readmitted = await context.client().post("/api/auth/google", {
      credential: googleCredential({ email: "vertrokken@example.test" }),
    });
    assert.equal(readmitted.status, 200);
  });

  test("a retracted invite does not let anybody in", async () => {
    await addToHouseList("bedacht@example.test", "editor");
    await removeFromHouseList("bedacht@example.test");

    const response = await context.client().post("/api/auth/google", {
      credential: googleCredential({ email: "bedacht@example.test" }),
    });

    assert.equal(response.status, 403);
    await assertDoorStayedShut(response, "bedacht@example.test");
  });

  test("an unverified Google address is refused even when it is on the list", async () => {
    await addToHouseList("onbevestigd@example.test", "editor");

    const response = await context.client().post("/api/auth/google", {
      credential: googleCredential({ email: "onbevestigd@example.test", emailVerified: false }),
    });

    assert.equal(response.status, 401);
    await assertDoorStayedShut(response, "onbevestigd@example.test");
  });

  test("a credential Google did not issue is refused", async () => {
    await addToHouseList("echt@example.test", "editor");

    const response = await context.client().post("/api/auth/google", {
      credential: forgedCredential(),
    });

    assert.equal(response.status, 401);
    await assertDoorStayedShut(response, "echt@example.test");
    assert.equal(await countUsers(), 0);
  });

  test("a credential that is not shaped like a Google token never reaches Google", async () => {
    const before = googleCalls.count;

    const response = await context.client().post("/api/auth/google", { credential: "niet-echt" });

    assert.equal(response.status, 401);
    assert.equal(googleCalls.count, before, "the server called out for a plainly wrong token");
    assert.equal(await countUsers(), 0);
  });

  test("a credential meant for another site's Google client is refused", async () => {
    await addToHouseList("elders@example.test", "editor");

    const response = await context.client().post("/api/auth/google", {
      credential: googleCredential({
        email: "elders@example.test",
        aud: "someone-elses-client-id.apps.googleusercontent.com",
      }),
    });

    assert.equal(response.status, 401);
    await assertDoorStayedShut(response, "elders@example.test");
  });

  test("a credential from an issuer that is not Google is refused", async () => {
    await addToHouseList("nepgoogle@example.test", "editor");

    const response = await context.client().post("/api/auth/google", {
      credential: googleCredential({
        email: "nepgoogle@example.test",
        iss: "https://not-google.test",
      }),
    });

    assert.equal(response.status, 401);
    await assertDoorStayedShut(response, "nepgoogle@example.test");
  });

  test("a Google answer without an account id is refused", async () => {
    await addToHouseList("zondersub@example.test", "editor");

    const response = await context.client().post("/api/auth/google", {
      credential: googleCredential({ email: "zondersub@example.test", sub: undefined }),
    });

    assert.equal(response.status, 401);
    await assertDoorStayedShut(response, "zondersub@example.test");
  });

  test("a Google answer without an address is refused", async () => {
    const response = await context.client().post("/api/auth/google", {
      credential: googleCredential({ email: undefined }),
    });

    assert.equal(response.status, 401);
    assert.equal(sessionCookieFrom(response), null);
    assert.equal(await countUsers(), 0);
  });

  test("an empty Google answer is refused", async () => {
    const response = await context.client().post("/api/auth/google", {
      credential: emptyPayloadCredential(),
    });

    assert.equal(response.status, 401);
    assert.equal(sessionCookieFrom(response), null);
    assert.equal(await countUsers(), 0);
  });

  test("the old style body with only an access token is refused", async () => {
    await addToHouseList("oudestijl@example.test", "editor");

    const response = await context.client().post("/api/auth/google", {
      access_token: "not-a-real-token-just-the-old-shape",
      email: "oudestijl@example.test",
    });

    assert.equal(response.status, 400);
    await assertDoorStayedShut(response, "oudestijl@example.test");
  });

  test("an empty body is refused", async () => {
    const response = await context.client().post("/api/auth/google", {});

    assert.equal(response.status, 400);
    assert.equal(sessionCookieFrom(response), null);
    assert.equal(await countUsers(), 0);
  });

  test("a credential that is not a string is refused", async () => {
    for (const credential of [{ token: "x" }, ["x"], 12345678901234, true]) {
      const response = await context.client().post("/api/auth/google", { credential });
      assert.ok(response.status >= 400, `${JSON.stringify(credential)} was accepted`);
      assert.equal(sessionCookieFrom(response), null);
    }
    assert.equal(await countUsers(), 0);
  });

  test("the refusal tells you what to do without naming who is on the list", async () => {
    await addToHouseList("iemand.anders@example.test", "editor");

    const response = await context.client().post("/api/auth/google", {
      credential: googleCredential({ email: "vreemde@example.test" }),
    });

    assert.equal(response.status, 403);
    assert.match(response.body.error, /lijst van het huis/i);
    assert.doesNotMatch(response.text, /iemand\.anders@example\.test/, "the answer leaked the list");
  });
});
