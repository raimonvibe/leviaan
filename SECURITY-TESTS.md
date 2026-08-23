# Security tests vs an OOP rewrite

Brief for writing tests in this repo (including with Claude Opus).  
Leviaan Campus is a small house board: about 40 JS files, no test suite yet. The hard part is proving the door stays closed, not inventing a class hierarchy.

**Do not start with an OOP or design-pattern rewrite.** Write tests on the app as it is. Extract a function only when a test is awkward.

---

## Why write tests if a hand check already worked?

A person tried Google login with an address that is not on the house list and saw a clear Dutch error. That is good. It is not enough.

- One click is one path, one browser, one day.
- The page can show a friendly message while the API still creates a user or a session. Tests must hit the **server** and check that **no user row** and **no session** were created.
- The next change to Beheer, login, or cookies can open the door again. Tests run after every change. A hand click will not.
- Other doors exist: retracted invite, person taken off the board, call not from our site, leftover old login style.

The hand check proved the wording. Tests lock the **rule**: unlisted email → no access.

---

## Order of work

1. Write security tests on the current code.
2. Extract only what tests need: an app factory, a login helper, a Google mock.
3. If a test is clumsy, move one function. Do not rename the app into classes, repositories, factories, observers, or a DI container.

Skip: `UserRepository`, `InviteService`, `AbstractFactory`, turning `AuthContext` into a class tree, UI refactors “so it looks object oriented.”

---

## Time (with an agent in this repo)

Together about **one session (2–5 hours)**, not days.

| Slice | Effort | Notes |
| --- | --- | --- |
| Test harness | 30–45 min | Runner, export the API without `listen()`, disposable database |
| Login, house list, session | 60–90 min | Highest value. Mock Google. |
| Who may do what | 45–60 min | Bewoner vs begeleider vs owner on each route |
| Input and origin | 20–30 min | Clean input, bad JSON, foreign site |
| Frontend checks | 20–30 min | No token in `localStorage`; requests send cookies |
| Browser login gate | 45–90 min | Fake Google. Do not use a live Google popup in CI. |
| CI + package scan | 20–30 min | Run the suite on each push |

A live-Google browser pack and weekly reports are extra. Skip them for the first suite.

---

## What “professional” means for this house

- Nobody who is not on the list gets in.
- Sessions stay on the server (cookie the page cannot read).
- Roles cannot be faked from the client.
- Other websites cannot call the API as if they were our site.

That is enough. Full fuzzing is not the first step.

---

## How to set up tests

Current shape:

- Backend: Express in `backend/src/main.js`, routes under `backend/src/routes/`, auth in `backend/src/middleware/auth.js`, session in `backend/src/session.js`, sanitise in `backend/src/sanitize.js`.
- Database: Postgres via `backend/src/db.js`. Schema is applied on boot from `backend/src/schema.sql`.
- Frontend: React. Session is a cookie. Axios uses `withCredentials: true` in `frontend/src/api/client.js`. Login sends only a Google ID token (`credential`), not an access token.

Practical setup:

1. Add a test runner for the backend (for example Node’s test runner or Vitest). Add `npm test` in `backend/package.json`.
2. Split `main.js` just enough that tests can import the Express `app` **without** calling `listen()`. Do not redesign the server.
3. Use a **separate** test database. Never point tests at the live house database. Apply `schema.sql` in setup. Clean tables between tests.
4. **Mock Google.** Intercept `verifyIdToken` (or the helper in `backend/src/routes/auth.js`). Return a payload you control. Never call Google from CI.
5. Send `Origin` on mutating requests, matching `FRONTEND_URL` in the test env.
6. Secrets in the test env only (dummy `JWT_SECRET` of at least 32 characters, dummy `GOOGLE_CLIENT_ID`, dummy `CREATOR_EMAIL`, test `DATABASE_URL`). No real secrets in git.

---

## Cases to cover

### Login and the house list

- Unlisted, verified Google email → refused. No row in `users`. No session cookie.
- Listed as bewoner (`editor_invites.role = visitor`) → may sign in as bewoner. Invite row is removed after login.
- Listed as begeleider (`editor_invites.role = editor`) → may sign in as begeleider.
- Owner email (`CREATOR_EMAIL`) → may sign in as beheerder without an invite.
- Person already in `users` → may sign in again (until they are removed from the board).
- Person removed from the board → cannot sign in until their email is added again.
- Retracted invite → cannot sign in.
- Fake or incomplete Google proof → refused. No session.
- Access-token-only body (old style, no `credential`) → refused.
- Unverified Google email → refused.

### Session

- After a real (mocked) login, the response body must **not** include a token the page can store.
- Later calls use the session cookie, not `Authorization: Bearer`.
- Logout clears the session. `/api/auth/me` then fails.
- After logout, protected routes refuse.

### Who may do what

Act as bewoner, begeleider, and owner (and owner looking-as-bewoner if you already have that helper).

- Bewoner cannot create or edit posts, cannot open trash, cannot open Beheer / invite APIs.
- Begeleider can post, trash, and invite; cannot remove or demote the owner.
- Nobody can delete themselves or the owner.
- Adding a bewoner email vs a begeleider email stores the right invite role.

### Input and origin

- Invalid email on invite is rejected.
- Post title/body/image rules still hold (too long, bad image type).
- Mutating request whose `Origin` is not our site is rejected.
- Broken JSON gets a safe error, not a stack trace.

### Frontend (lightweight)

- `frontend/src/api/client.js` sends credentials and does not attach a token from `localStorage`.
- `frontend/src/contexts/AuthContext.jsx` login only posts `{ credential }`.
- Login page does not keep a leftover client token after load.

Do not add a full Playwright suite against live Google in this first pass.

---

## What not to put in the tests or in new docs

- Real emails of the house, real secrets, or the live database URL.
- A walkthrough of how to bypass the door.
- Exact limiter numbers as a “how to flood us” note. Assert only that too many tries are refused.

---

## Done when

- `npm test` in `backend` is green without network access to Google.
- Unlisted login is asserted as: error + no user + no session — not only “the JSON contains a Dutch sentence.”
- The suite can run in CI on each push.

If you need to change production code to make this testable, keep the change small (export `app`, maybe a thin Google verify wrapper). Do not start an architecture project.

---

## Status

Done. The suite lives in `backend/tests/` and `frontend/tests/`.
How to run it, how to add to it, and what the first pass turned up:
[TESTS.md](TESTS.md).
