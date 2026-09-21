# Security audit — September 2026

A full read of the app: every backend file, the frontend auth and render paths,
git history, dependencies, CI, and the two live origins.

Audited at commit `2b42129`, on 2026-09-21.

Nothing found here is an emergency. The app is built with care and gets several
things right that projects this size usually get wrong. Two findings are worth
fixing; the rest is hardening and notes for later.

---

## How this was checked

- Read all of `backend/src` and the auth, image, and render paths in `frontend/src`.
- Scanned the whole git history for secrets, not only the working tree.
- `npm audit` on both packages.
- Read `vercel.json`, `render.yaml`, and the three GitHub workflows.
- Live probes against `leviaan.vercel.app` and `leviaan.onrender.com`: header
  checks, unauthenticated calls to every protected route, CORS and Origin
  rejection, and a rate-limit spoofing attempt.

**Not** checked: logged-in flows against production. That needs a real Google
account and would change the live board. Those paths were read, not driven.

---

## Findings

### 1. An editor can delete another editor, but cannot demote one

**Medium.** `backend/src/routes/editors.js`, `DELETE /api/editors/:id`.

The route is gated only by the router-level `requireEditor`. Its guards rule out
yourself, the creator, and the owner email. They do not rule out another editor.

Now compare `PATCH /:id/role` in the same file. That one requires
`requireCreator`, and it refuses to demote an editor at all — "Een begeleider
blijft begeleider". That rule is tested in `backend/tests/permissions.test.js`
("a begeleider cannot hand out or take away roles").

So the milder action is creator-only, while the harsher one is open to any
begeleider. Deleting the user row is strictly worse than demoting them.

`POST /invites` is also editor-level, so one begeleider can remove every other
begeleider and invite their own. This is not a way to become beheerder. It is a
lateral move across a line the code draws everywhere else.

The tests have the same blind spot. They cover an editor removing a *bewoner*,
and the beheerder removing an editor. Never an editor removing an editor.

Confirmed by reading the guard list. Not reproduced live — there was no Postgres
or Docker on the machine used for this audit.

**Fix:** either move the route behind `requireCreator`, or refuse when the target
is an editor, matching the demote rule. Add the missing test either way.

### 2. The board returns every post at full size, every time

**Medium, availability.** `backend/src/routes/posts.js`, `GET /`.

The query has no `LIMIT` and no paging. `mapPost` includes `imageData`, which is
the whole base64 image — up to 1.8 MB each (`MAX_IMAGE_CHARS`). Every board load
ships the entire history. Any logged-in person may do that 300 times per 15
minutes.

The response grows without bound as the house fills the board, and the images sit
in Postgres `TEXT` columns. Nothing is broken today. It gets worse on its own.

**Fix:** page the board, or leave `imageData` out of the list response and fetch
images per post.

### 3. Dev leftovers in the production CSP

**Low.** `frontend/vercel.json`.

`connect-src` allows `http://localhost:3000` and the wildcard
`https://*.onrender.com`. The page reaches the API same-origin through the
`/api` rewrite, so `'self'` already covers normal use.

Neither is exploitable by itself. Both widen where injected script could send
data, if it ever got in.

**Fix:** drop the localhost entry, and narrow the wildcard to the one host.

### 4. Rate limits are per instance and held in memory

**Low.** `backend/src/app.js`.

Live headers came back with two different `reset` values on consecutive
requests, so more than one instance is running, each counting on its own. The
real ceiling is a multiple of the configured one, and every deploy resets it.

Fine for a house board. Worth knowing before trusting the numbers.

### 5. Logging out does not end the session server-side

**Low.** `backend/src/routes/auth.js`, `backend/src/session.js`.

Tokens last 14 days. `/auth/logout` only clears the cookie. A token that leaked
stays good until it expires.

Mostly covered already: `requireAuth` re-reads the user row on every request, so
removing someone or changing their role bites immediately. The suite proves it
("a removed person loses their session at once"). Only a stolen token outlives
the logout.

### 6. Two workflows do not limit their token

**Low.** `.github/workflows/tests.yml`, `.github/workflows/keepalive.yml`.

Neither declares a `permissions:` block, so both take the repository default.
`osv-scanner.yml` does this properly and can be copied.

**Fix:** add `permissions: contents: read` to both.

### 7. Smaller notes

- The session cookie already has `Path=/`, `Secure`, `HttpOnly` and no `Domain`,
  so it qualifies for the `__Host-` prefix. Adding it would stop a subdomain
  from overwriting the cookie.
- Login matches on `google_id = $1 OR email = $2` and then rewrites `google_id`.
  If a Google address were ever deleted and handed to a different person, they
  would inherit the account. Very unlikely here. Noted because it is the one
  place an identity is re-bound.
- `base_role` has no `CHECK` constraint in `schema.sql`, unlike `role`. Only
  server-validated values are ever written to it, so this is tidiness.

---

## What holds up

Worth writing down, so a later change does not quietly undo it.

**The door**

- Authorization comes from the database row on every request, never from the
  JWT claim. That is why removing someone takes effect at once.
- The JWT is verified with `algorithms: ["HS256"]` pinned. No algorithm
  confusion, no `alg: none`.
- Google tokens get checked twice: the library verifies, then the route checks
  `aud`, `iss` and `email_verified` by hand, after a shape and length check.
- The test seam in `googleVerify.js` throws if `NODE_ENV` is production, so a
  live server cannot be pointed away from Google.
- "Test als" cannot escalate. It reads `base_role`, and that endpoint never
  writes `base_role`. Tested from both the bewoner and begeleider side.

**Input and output**

- Every SQL query is parameterized. The only interpolated pieces are fixed
  strings in the file.
- No XSS surface: no `dangerouslySetInnerHTML`, no user-controlled `href`,
  images restricted to `data:` URLs of jpeg, png, webp or gif, with SVG refused
  outright. `script-src` carries neither `unsafe-inline` nor `unsafe-eval`.
- Uploads are re-encoded through a canvas, which drops metadata and anything
  hidden in the original file.
- Logs redact emails and drop `credential`, `cookie`, `token` and `imageData`
  keys before anything is written.

**The edges**

- CSRF is covered twice: `SameSite=Lax` plus an Origin allowlist on every
  non-GET. Checked live — hostile Origin 403, missing Origin 403, real Origin
  200, and a hostile preflight gets no `Access-Control-Allow-Origin` back.
- The rate limiter could not be fooled with a spoofed `X-Forwarded-For`. The
  `trust proxy: 1` setting is right for this setup.
- All seven protected endpoints answer 401 without a cookie.
- HSTS on both origins. `X-Frame-Options: DENY` and `frame-ancestors 'none'`.
- Postgres connects with `rejectUnauthorized: true`. Often switched off in
  projects this size.

**The repo**

- No secret in the working tree, and none anywhere in git history. No real
  `.env` was ever committed.
- `npm audit`: zero vulnerabilities in both packages.
- CI runs on `pull_request`, not `pull_request_target`, and never drops
  `github.event` values into a shell. No script injection path.

---

## Suggested order

1. Finding 1 — close the editor-deletes-editor gap, add the missing test.
2. Finding 3 — two lines out of the CSP.
3. Finding 6 — two `permissions:` blocks.
4. Finding 2 — page the board, before the board gets big.

Findings 4, 5 and 7 need no action today.
