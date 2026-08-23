# Running and writing the tests

Companion to [SECURITY-TESTS.md](SECURITY-TESTS.md), which explains *why* these
tests exist. This one is the working guide: how to get the suite running, how to
keep it fast and honest, and what the first pass turned up.

The suite is **79 tests** — 72 backend, 7 frontend. It needs no network, no
Google account, and no Playwright.

---

## 1. Setting it up

### You need a database the tests may empty

Every test starts from empty tables. That is the whole point, and it is also why
the suite must never see the house database. Four locks are in place, in
`backend/tests/helpers/env.js`:

| Lock | What it refuses |
| --- | --- |
| `TEST_DATABASE_URL` must be set | Running with no target at all |
| It must not equal `DATABASE_URL` | The live database, copied by hand |
| The database name must contain `test` | `leviaan`, `neondb`, anything real |
| The host must be this machine | Anything remote, unless `ALLOW_REMOTE_TEST_DB=1` |

If one of these fires you get a sentence telling you which, not a stack trace.
Do not weaken them to make a run work — fix the URL instead.

### The quick way (Docker)

From the repo root:

```
npm run test:db:up
```

That starts a throwaway Postgres on port **55432** and removes itself when
stopped. Then create `backend/.env.test` (git-ignored) from
`backend/.env.test.example`:

```
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:55432/leviaan_test
```

When you are done: `npm run test:db:down`.

### The other way (a Postgres you already have)

Make the database once:

```
createdb leviaan_test
```

and point `TEST_DATABASE_URL` at it. Port 5432 instead of 55432. The name still
has to contain `test`.

---

## 2. Running it

```
npm test                    # everything, from the repo root
npm run test:backend
npm run test:frontend
```

A single file, while you are working on it:

```
node --test backend/tests/session.test.js
```

Watch mode while writing:

```
node --test --watch backend/tests/session.test.js
```

Only the tests whose name matches something — name the file too:

```
node --test --test-name-pattern="refused" backend/tests/auth-house-list.test.js
```

Give it the file. Across the whole suite, a pattern that matches nothing in some
file leaves that file's server open and the run never ends; Node's runner skips
the closing hook when every test in a file is filtered out.

### Reading a failure

Test names are written as sentences on purpose. `✖ an address that is not on
the list is refused, with no account and no session` tells you what broke
without opening the file. Most assertions carry a message
(`"a session cookie was handed out anyway"`) that says what the failure *means*,
not just which numbers differed.

---

## 3. Things that make the suite behave

**Run the files one at a time.** `--test-concurrency=1` is in the `npm test`
script. All files share one database; parallel runs would truncate each other's
tables halfway through. If you add a runner flag, keep this one.

**Do not switch rate limits on.** The harness builds the app with limiters off
by default, so 70-odd tests can log in without tripping the 15-minute window.
Only `rate-limit.test.js` asks for `useHarness({ rateLimits: true })`, and it
lives in its own file so its state cannot spill.

**Come in through the front door.** `signInAs(context, { role: "editor" })` puts
the address on the house list and then logs in through `/api/auth/google` for
real. Do not insert a user row and forge a cookie — a test that skips the door
cannot notice the door breaking.

**Sign in as few people as you need.** Each `signInAs` is a real login plus a
username call, about 20 ms. Tests that need three roles cost three logins.

**Assert the effect, never only the message.** A Dutch sentence in the JSON
proves the wording, nothing else. For anything about access, assert all three:
the status, the database (`countUsersWithEmail`, `findInvite`), and the session
(`sessionCookieFrom`). `assertDoorStayedShut` in `auth-house-list.test.js` does
exactly that and is worth copying.

**Never write down a limiter number.** `rate-limit.test.js` loops until it is
refused and asserts only that refusal happened. A test that says "the 21st try
fails" is a note on how to flood the house.

**Use `@example.test` addresses.** Reserved by the RFCs, so a stray test can
never mail a real person. No real addresses, no real secrets, no live URL — the
suite sets its own dummy `JWT_SECRET`, `GOOGLE_CLIENT_ID` and `CREATOR_EMAIL`.

---

## 4. The helpers

Everything lives in `backend/tests/helpers/`.

| File | What it gives you |
| --- | --- |
| `env.js` | Dummy secrets and the database locks. Imported first, before anything reaches `src/db.js`. |
| `harness.js` | `useHarness()` — one server, one database, one fake Google, tables emptied between tests. And `signInAs()`. |
| `server.js` | `Client` — a browser-ish HTTP client with a cookie jar, so you can see exactly what a page would and would not hold. |
| `google.js` | The fake Google. `googleCredential({ ... })` hands out a credential with a payload you control. |
| `db.js` | `findUserByEmail`, `findInvite`, `addToHouseList`, `countUsers`, and raw `query`. |

### Writing a new test

```js
import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { findInvite } from "./helpers/db.js";
import { signInAs, useHarness } from "./helpers/harness.js";

const context = useHarness();

describe("something", () => {
  test("says what it proves", async () => {
    const begeleider = await signInAs(context, { role: "editor" });

    const response = await begeleider.client.post("/api/editors/invites", {
      email: "iemand@example.test",
      role: "visitor",
    });

    assert.equal(response.status, 201);
    assert.equal((await findInvite("iemand@example.test")).role, "visitor");
  });
});
```

The client sends `Origin: http://localhost:5173` on mutating calls by itself, so
requests look like they came from the real page. Pass `{ origin: "https://elders.example" }`
to test a foreign site, or `{ origin: null }` to send none at all.

### Faking Google

`googleCredential()` gives a normal, verified account. Every field can be bent:

```js
googleCredential({ email: "iemand@example.test" })
googleCredential({ emailVerified: false })       // Google has not confirmed it
googleCredential({ aud: "other-client-id" })     // meant for another site
googleCredential({ iss: "https://not-google.test" })
googleCredential({ sub: undefined })             // a field simply missing
forgedCredential()                                // Google refuses to verify it
```

`backend/src/googleVerify.js` is the only place that talks to Google, and the
tests replace that one function. It refuses to be replaced when `NODE_ENV` is
`production`, so a live server can never be pointed away from Google.

---

## 5. What is in the suite

| File | Tests | What it holds down |
| --- | --- | --- |
| `backend/tests/auth-house-list.test.js` | 20 | The front door: on the list, or not in |
| `backend/tests/session.test.js` | 14 | The session stays on the server |
| `backend/tests/permissions.test.js` | 20 | Bewoner, begeleider, beheerder on every route |
| `backend/tests/input-and-origin.test.js` | 17 | What comes in, and from which site |
| `backend/tests/rate-limit.test.js` | 1 | Knocking too often stops working |
| `frontend/tests/client-contract.test.js` | 7 | The page keeps no token |

---

## 6. CI

`.github/workflows/tests.yml` runs on every push and pull request:

- **backend** — Postgres service container, `npm ci`, `npm test`
- **frontend** — `npm ci`, `npm test`, `npm run build`
- **packages** — `npm audit --audit-level=high` on both package lists

No secrets are needed. Google is faked, so CI never needs a consent screen.

The audit step passes today. The backend has two *moderate* advisories
(`uuid`, through `gaxios`, through `google-auth-library`) that sit under the
gate on purpose — the gate is there to stop a *high* or *critical* one from
being merged unnoticed, not to fail the build over transitive noise.

---

## 7. What the first pass turned up

Three things worth knowing. None were changed: the brief said keep production
edits small, and none of these is a hole.

### An invite with no role becomes begeleider

`POST /api/editors/invites` does `String(req.body?.role || "editor")`. A missing
role, `""` or `null` all fall through to **editor** — the more powerful of the
two. A slip in the Beheer form sends someone in as begeleider rather than
bewoner.

It is documented by a test rather than quietly changed
(`leaving the role out means begeleider, never beheerder`), because the Beheer
screen may be relying on it. If you would rather it default to bewoner, change
the default and flip that test.

### A body over 2 MB answers 500, not 413

`express.json({ limit: "2mb" })` throws a `PayloadTooLargeError`. The error
handler in `backend/src/app.js` only maps `entity.parse.failed` and status 400,
so an oversized photo falls into the 500 branch: a generic message on screen and
a full stack trace in the log.

Nothing leaks — the test checks that. But 413 with "deze aanvraag is te groot"
would tell the person what actually happened.

### Logging out clears the cookie; it does not revoke the token

`clearSessionCookie` empties the browser's cookie. The JWT itself stays valid
for its 14 days, because there is no server-side session store. If a token were
copied off a device before logout, logging out would not stop it.

For a house board of forty people this is a fair trade, and it is written down
in the tests rather than hidden. Two things already limit it: removing somebody
from the board kills their session at the next request (`requireAuth` looks the
user up every time), and the cookie is `HttpOnly`, so a page cannot read the
token to copy it. If you ever want real revocation, the small version is a
`token_version` column on `users`, bumped on logout and checked in `requireAuth`.

---

## 8. What is deliberately not covered yet

From the brief, still open — fine to leave for a second pass:

- **A browser test of the login gate.** Would need a fake Google page. Do not
  point it at real Google in CI.
- **Attendance and stats in depth.** They are touched, not swept.
- **Fuzzing.** Not the first step for a house board.
- **Frontend rendering.** The frontend checks read source text, so they prove
  what the code promises, not what React draws. Enough to hold down "no token in
  the page"; not enough to catch a broken screen.
