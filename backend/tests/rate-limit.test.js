// Knocking on the door over and over must stop working. This file runs the app
// with its limiters switched on; the rest of the suite runs without them so one
// test cannot throttle the next.
//
// On purpose, no number is written down here. The test asks "does it stop?",
// not "after how many tries?" — the second question is a recipe.
import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { addToHouseList, countUsers } from "./helpers/db.js";
import { googleCredential } from "./helpers/google.js";
import { useHarness } from "./helpers/harness.js";
import { sessionCookieFrom } from "./helpers/server.js";

const context = useHarness({ rateLimits: true });

const GIVE_UP_AFTER = 500;

describe("knocking too often", () => {
  test("a run of login attempts is cut off, and cutting off does not let anybody in", async () => {
    await addToHouseList("geduldig@example.test", "editor");
    const client = context.client();

    let refused = null;
    for (let attempt = 0; attempt < GIVE_UP_AFTER && !refused; attempt += 1) {
      const response = await client.post("/api/auth/google", {
        credential: googleCredential({ email: "indringer@example.test" }),
      });
      if (response.status === 429) refused = response;
    }

    assert.ok(refused, "the door kept answering knock after knock");
    assert.match(refused.body.error, /te veel/i);
    assert.equal(sessionCookieFrom(refused), null, "the refusal handed out a session");
    assert.equal(await countUsers(), 0, "a blocked run still made an account");
  });
});
