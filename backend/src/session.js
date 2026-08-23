const SESSION_COOKIE = "leviaan_session";
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

// The page and /api now share a host, so this is a first-party cookie.
const LIVE = "Path=/; HttpOnly; Secure; SameSite=Lax";

// Older deploys used a third-party cookie. Browsers store that separately;
// login must expire it or an old value can keep winning.
const LEGACY = [
  "Path=/; HttpOnly; Secure; SameSite=None; Partitioned",
  "Path=/; HttpOnly; Secure; SameSite=None",
];

function expire(res, attributes) {
  res.append("Set-Cookie", `${SESSION_COOKIE}=; Max-Age=0; ${attributes}`);
}

function expireStaleCookies(res) {
  for (const attributes of LEGACY) expire(res, attributes);
}

export function setSessionCookie(res, token) {
  expireStaleCookies(res);
  const value = encodeURIComponent(token);
  const maxAge = Math.floor(MAX_AGE_MS / 1000);
  res.append("Set-Cookie", `${SESSION_COOKIE}=${value}; Max-Age=${maxAge}; ${LIVE}`);
}

export function clearSessionCookie(res) {
  expireStaleCookies(res);
  expire(res, LIVE);
}

export function readSessionTokens(req) {
  const header = req.headers.cookie;
  if (!header) return [];

  const tokens = [];
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    if (name !== SESSION_COOKIE) continue;
    try {
      tokens.push(decodeURIComponent(part.slice(separator + 1).trim()));
    } catch {
      // Skip a cookie the browser could not decode.
    }
  }
  return tokens;
}

export function readSessionToken(req) {
  const tokens = readSessionTokens(req);
  return tokens.length ? tokens[tokens.length - 1] : null;
}
