// Who may do what. A bewoner reads the board; a begeleider runs it; the
// beheerder owns it. None of that may be decided by the page.
import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { findInvite, findUserByEmail } from "./helpers/db.js";
import { signInAs, TEST_ENV, useHarness } from "./helpers/harness.js";

const context = useHarness();

function newPost(overrides = {}) {
  return {
    title: "Samen koken",
    body: "We koken om zes uur in de gezamenlijke keuken.",
    activityDate: "2030-03-01",
    activityEndDate: "2030-03-01",
    ...overrides,
  };
}

/** Routes only a begeleider or the beheerder may touch. */
function editorOnlyCalls(client, postId, userId, inviteId) {
  return [
    ["POST /api/posts", () => client.post("/api/posts", newPost())],
    ["PUT /api/posts/:id", () => client.put(`/api/posts/${postId}`, newPost({ title: "Anders" }))],
    ["DELETE /api/posts/:id", () => client.delete(`/api/posts/${postId}`)],
    ["POST /api/posts/:id/restore", () => client.post(`/api/posts/${postId}/restore`, {})],
    ["DELETE /api/posts/:id/permanent", () => client.delete(`/api/posts/${postId}/permanent`)],
    ["GET /api/posts/trash", () => client.get("/api/posts/trash")],
    ["DELETE /api/posts/trash", () => client.delete("/api/posts/trash")],
    ["GET /api/editors", () => client.get("/api/editors")],
    ["POST /api/editors/invites", () => client.post("/api/editors/invites", { email: "nieuw@example.test" })],
    ["DELETE /api/editors/invites/:id", () => client.delete(`/api/editors/invites/${inviteId}`)],
    ["DELETE /api/editors/:id", () => client.delete(`/api/editors/${userId}`)],
    ["PATCH /api/editors/:id/role", () => client.patch(`/api/editors/${userId}/role`, { role: "editor" })],
  ];
}

describe("who may do what", () => {
  test("a bewoner may read the board and say they are coming", async () => {
    const begeleider = await signInAs(context, { role: "editor" });
    const created = await begeleider.client.post("/api/posts", newPost());
    assert.equal(created.status, 201);
    const postId = created.body.post.id;

    const bewoner = await signInAs(context, { role: "visitor" });

    assert.equal((await bewoner.client.get("/api/posts")).status, 200);
    assert.equal((await bewoner.client.get(`/api/posts/${postId}`)).status, 200);
    assert.equal((await bewoner.client.post(`/api/posts/${postId}/attend`, {})).status, 200);
    assert.equal((await bewoner.client.delete(`/api/posts/${postId}/attend`)).status, 200);
    assert.equal((await bewoner.client.get("/api/stats")).status, 200);
  });

  test("a bewoner is turned away from every route that changes the board", async () => {
    const begeleider = await signInAs(context, { role: "editor" });
    const created = await begeleider.client.post("/api/posts", newPost());
    const postId = created.body.post.id;
    const invited = await begeleider.client.post("/api/editors/invites", {
      email: "uitgenodigd@example.test",
      role: "editor",
    });
    const inviteId = invited.body.invite.id;

    const bewoner = await signInAs(context, { role: "visitor" });
    const target = await findUserByEmail(begeleider.email);

    for (const [name, call] of editorOnlyCalls(bewoner.client, postId, target.id, inviteId)) {
      const response = await call();
      assert.equal(response.status, 403, `${name} let a bewoner through (${response.status})`);
    }
  });

  test("a bewoner does not get to see how full the bin is", async () => {
    const bewoner = await signInAs(context, { role: "visitor" });

    const stats = await bewoner.client.get("/api/stats");

    assert.equal(stats.status, 200);
    assert.equal("trash" in stats.body, false, "the bin count was handed to a bewoner");
  });

  test("a begeleider may post, bin, empty the bin and invite", async () => {
    const begeleider = await signInAs(context, { role: "editor" });

    const created = await begeleider.client.post("/api/posts", newPost());
    assert.equal(created.status, 201);
    const postId = created.body.post.id;

    assert.equal((await begeleider.client.put(`/api/posts/${postId}`, newPost({ title: "Toch soep" }))).status, 200);
    assert.equal((await begeleider.client.delete(`/api/posts/${postId}`)).status, 200);
    assert.equal((await begeleider.client.get("/api/posts/trash")).status, 200);
    assert.equal((await begeleider.client.post(`/api/posts/${postId}/restore`, {})).status, 200);
    assert.equal((await begeleider.client.delete(`/api/posts/${postId}`)).status, 200);
    assert.equal((await begeleider.client.delete("/api/posts/trash")).status, 200);

    const invited = await begeleider.client.post("/api/editors/invites", {
      email: "nieuwe.begeleider@example.test",
      role: "editor",
    });
    assert.equal(invited.status, 201);
    assert.equal((await begeleider.client.get("/api/editors")).status, 200);
  });

  test("a begeleider cannot hand out or take away roles", async () => {
    const begeleider = await signInAs(context, { role: "editor" });
    const bewoner = await signInAs(context, { role: "visitor" });
    const target = await findUserByEmail(bewoner.email);

    const promoted = await begeleider.client.patch(`/api/editors/${target.id}/role`, { role: "editor" });

    assert.equal(promoted.status, 403);
    const unchanged = await findUserByEmail(bewoner.email);
    assert.equal(unchanged.role, "visitor");
  });

  test("nobody can take the beheerder off the board", async () => {
    const owner = await signInAs(context, { role: "creator" });
    const begeleider = await signInAs(context, { role: "editor" });
    const ownerRow = await findUserByEmail(TEST_ENV.ownerEmail);

    const byEditor = await begeleider.client.delete(`/api/editors/${ownerRow.id}`);
    assert.equal(byEditor.status, 400);
    assert.match(byEditor.body.error, /beheerder/i);

    const bySelf = await owner.client.delete(`/api/editors/${ownerRow.id}`);
    assert.equal(bySelf.status, 400);

    assert.ok(await findUserByEmail(TEST_ENV.ownerEmail), "the beheerder was removed");
  });

  test("nobody can demote the beheerder", async () => {
    const owner = await signInAs(context, { role: "creator" });
    const ownerRow = await findUserByEmail(TEST_ENV.ownerEmail);

    const demoted = await owner.client.patch(`/api/editors/${ownerRow.id}/role`, { role: "visitor" });

    assert.equal(demoted.status, 400);
    assert.equal((await findUserByEmail(TEST_ENV.ownerEmail)).role, "creator");
  });

  test("nobody can take themselves off the board", async () => {
    const begeleider = await signInAs(context, { role: "editor" });
    const self = await findUserByEmail(begeleider.email);

    const response = await begeleider.client.delete(`/api/editors/${self.id}`);

    assert.equal(response.status, 400);
    assert.ok(await findUserByEmail(begeleider.email), "a begeleider deleted themselves");
  });

  test("a begeleider stays a begeleider", async () => {
    const owner = await signInAs(context, { role: "creator" });
    const begeleider = await signInAs(context, { role: "editor" });
    const target = await findUserByEmail(begeleider.email);

    const demoted = await owner.client.patch(`/api/editors/${target.id}/role`, { role: "visitor" });

    assert.equal(demoted.status, 400);
    assert.equal((await findUserByEmail(begeleider.email)).role, "editor");
  });

  test("the beheerder can make a bewoner a begeleider", async () => {
    const owner = await signInAs(context, { role: "creator" });
    const bewoner = await signInAs(context, { role: "visitor" });
    const target = await findUserByEmail(bewoner.email);

    const promoted = await owner.client.patch(`/api/editors/${target.id}/role`, { role: "editor" });

    assert.equal(promoted.status, 200);
    const after = await findUserByEmail(bewoner.email);
    assert.equal(after.role, "editor");
    assert.equal(after.base_role, "editor");
  });

  test("a bewoner address and a begeleider address are put on the list with the right role", async () => {
    const begeleider = await signInAs(context, { role: "editor" });

    const asBewoner = await begeleider.client.post("/api/editors/invites", {
      email: "toekomstige.bewoner@example.test",
      role: "visitor",
    });
    assert.equal(asBewoner.status, 201);
    assert.equal((await findInvite("toekomstige.bewoner@example.test")).role, "visitor");

    const asBegeleider = await begeleider.client.post("/api/editors/invites", {
      email: "toekomstige.begeleider@example.test",
      role: "editor",
    });
    assert.equal(asBegeleider.status, 201);
    assert.equal((await findInvite("toekomstige.begeleider@example.test")).role, "editor");
  });

  test("the beheerder address cannot be put on the invite list", async () => {
    const begeleider = await signInAs(context, { role: "editor" });

    const response = await begeleider.client.post("/api/editors/invites", {
      email: TEST_ENV.ownerEmail,
      role: "editor",
    });

    assert.equal(response.status, 400);
    assert.equal(await findInvite(TEST_ENV.ownerEmail), null);
  });

  test("a bewoner cannot promote themselves by switching role", async () => {
    const bewoner = await signInAs(context, { role: "visitor" });

    for (const role of ["editor", "creator"]) {
      const response = await bewoner.client.patch("/api/auth/role", { role });
      assert.equal(response.status, 403, `a bewoner switched to ${role}`);
    }

    const after = await findUserByEmail(bewoner.email);
    assert.equal(after.role, "visitor");
  });

  test("a begeleider may look as a bewoner, and gets a bewoner's answers while doing it", async () => {
    const begeleider = await signInAs(context, { role: "editor" });

    const looking = await begeleider.client.patch("/api/auth/role", { role: "visitor" });
    assert.equal(looking.status, 200);
    assert.equal(looking.body.user.role, "visitor");
    assert.equal(looking.body.user.baseRole, "editor");

    assert.equal((await begeleider.client.post("/api/posts", newPost())).status, 403);
    assert.equal((await begeleider.client.get("/api/editors")).status, 403);

    const back = await begeleider.client.patch("/api/auth/role", { role: "editor" });
    assert.equal(back.status, 200);
    assert.equal((await begeleider.client.post("/api/posts", newPost())).status, 201);
  });

  test("a begeleider cannot switch themselves up to beheerder", async () => {
    const begeleider = await signInAs(context, { role: "editor" });

    const response = await begeleider.client.patch("/api/auth/role", { role: "creator" });

    assert.equal(response.status, 403);
    assert.equal((await findUserByEmail(begeleider.email)).role, "editor");
  });

  test("the beheerder may look as bewoner or begeleider and come back", async () => {
    const owner = await signInAs(context, { role: "creator" });

    for (const role of ["visitor", "editor", "creator"]) {
      const response = await owner.client.patch("/api/auth/role", { role });
      assert.equal(response.status, 200, `the beheerder could not look as ${role}`);
      assert.equal(response.body.user.role, role);
      assert.equal(response.body.user.isOwner, true);
    }
  });

  test("a made-up role is refused", async () => {
    const owner = await signInAs(context, { role: "creator" });

    for (const role of ["admin", "superuser", "", null, 42]) {
      const response = await owner.client.patch("/api/auth/role", { role });
      assert.equal(response.status, 403, `${role} was accepted as a role`);
    }
  });

  test("someone who has not picked a username yet cannot act", async () => {
    const begeleider = await signInAs(context, { role: "editor", username: null });

    for (const call of [
      () => begeleider.client.get("/api/posts"),
      () => begeleider.client.post("/api/posts", newPost()),
      () => begeleider.client.get("/api/editors"),
      () => begeleider.client.get("/api/stats"),
    ]) {
      const response = await call();
      assert.equal(response.status, 403);
      assert.equal(response.body.needsUsername, true);
    }
  });

  test("taking a begeleider off the board keeps their activities", async () => {
    const owner = await signInAs(context, { role: "creator" });
    const begeleider = await signInAs(context, { role: "editor", username: "Anna" });
    const created = await begeleider.client.post("/api/posts", newPost({ title: "Tuinfeest" }));
    assert.equal(created.status, 201);
    const postId = created.body.post.id;
    const target = await findUserByEmail(begeleider.email);

    const removed = await owner.client.delete(`/api/editors/${target.id}`);
    assert.equal(removed.status, 200);
    assert.equal(await findUserByEmail(begeleider.email), null);

    const board = await owner.client.get("/api/posts");
    assert.equal(board.status, 200);
    const kept = board.body.posts.find((post) => post.id === postId);
    assert.ok(kept, "the activity disappeared with the begeleider");
    assert.equal(kept.title, "Tuinfeest");
    assert.equal(kept.author.username, "Anna");
  });

  test("a begeleider may take a bewoner off the board", async () => {
    const begeleider = await signInAs(context, { role: "editor" });
    const bewoner = await signInAs(context, { role: "visitor" });
    const target = await findUserByEmail(bewoner.email);

    const response = await begeleider.client.delete(`/api/editors/${target.id}`);

    assert.equal(response.status, 200);
    assert.equal(await findUserByEmail(bewoner.email), null);
    assert.equal(await findInvite(bewoner.email), null, "the address stayed on the list");
  });

  test("a removed person loses their session at once", async () => {
    const begeleider = await signInAs(context, { role: "editor" });
    const bewoner = await signInAs(context, { role: "visitor" });
    const target = await findUserByEmail(bewoner.email);

    assert.equal((await bewoner.client.get("/api/posts")).status, 200);
    assert.equal((await begeleider.client.delete(`/api/editors/${target.id}`)).status, 200);
    assert.equal((await bewoner.client.get("/api/posts")).status, 401);
  });
});
