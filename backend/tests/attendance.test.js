// Meedoen is for activities that are still to come. Once the last day is over,
// the list of who took part is a record: nobody signs up or drops out afterwards.
import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { findUserByEmail, query } from "./helpers/db.js";
import { signInAs, useHarness } from "./helpers/harness.js";

const context = useHarness();

/** A YYYY-MM-DD date in Dutch time, `days` away from today. */
function dutchDate(days) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function postFor(begeleider, activityDate, activityEndDate = activityDate) {
  const created = await begeleider.client.post("/api/posts", {
    title: "Samen koken",
    body: "We koken om zes uur in de gezamenlijke keuken.",
    activityDate,
    activityEndDate,
  });
  assert.equal(created.status, 201);
  return created.body.post;
}

describe("meedoen and the calendar", () => {
  test("a bewoner cannot sign up for an activity that is over", async () => {
    const begeleider = await signInAs(context, { role: "editor" });
    const post = await postFor(begeleider, dutchDate(-3), dutchDate(-1));
    assert.equal(post.ended, true);

    const bewoner = await signInAs(context, { role: "visitor" });
    const response = await bewoner.client.post(`/api/posts/${post.id}/attend`, {});

    assert.equal(response.status, 409);
    const count = await query("SELECT COUNT(*)::int AS count FROM attendances WHERE post_id = $1", [post.id]);
    assert.equal(count.rows[0].count, 0, "a sign-up was stored for a past activity");
  });

  test("a bewoner cannot drop out of an activity that is over", async () => {
    const begeleider = await signInAs(context, { role: "editor" });
    const post = await postFor(begeleider, dutchDate(-1));
    const bewoner = await signInAs(context, { role: "visitor" });
    const user = await findUserByEmail(bewoner.email);
    await query("INSERT INTO attendances (post_id, user_id) VALUES ($1, $2)", [post.id, user.id]);

    const response = await bewoner.client.delete(`/api/posts/${post.id}/attend`);

    assert.equal(response.status, 409);
    const count = await query("SELECT COUNT(*)::int AS count FROM attendances WHERE post_id = $1", [post.id]);
    assert.equal(count.rows[0].count, 1, "the record of who took part was changed afterwards");
  });

  test("an activity stays open on its last day, also when it began earlier", async () => {
    const begeleider = await signInAs(context, { role: "editor" });
    const today = await postFor(begeleider, dutchDate(0));
    const running = await postFor(begeleider, dutchDate(-2), dutchDate(0));
    const bewoner = await signInAs(context, { role: "visitor" });

    for (const post of [today, running]) {
      assert.equal(post.ended, false);
      const joined = await bewoner.client.post(`/api/posts/${post.id}/attend`, {});
      assert.equal(joined.status, 200);
      assert.equal(joined.body.post.attending, true);
      const left = await bewoner.client.delete(`/api/posts/${post.id}/attend`);
      assert.equal(left.status, 200);
      assert.equal(left.body.post.attending, false);
    }
  });
});
