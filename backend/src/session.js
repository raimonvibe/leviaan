const SESSION_COOKIE = "leviaan_session";
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

function cookieBase() {
  return "Path=/; HttpOnly; Secure; SameSite=None; Partitioned";
}

export function setSessionCookie(res, token) {
  const value = encodeURIComponent(token);
  const maxAge = Math.floor(MAX_AGE_MS / 1000);
  res.append("Set-Cookie", `${SESSION_COOKIE}=${value}; Max-Age=${maxAge}; ${cookieBase()}`);
}

export function clearSessionCookie(res) {
  res.append("Set-Cookie", `${SESSION_COOKIE}=; Max-Age=0; ${cookieBase()}`);
}

export function readSessionToken(req) {
  const header = req.headers.cookie;
  if (!header) return null;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    if (name !== SESSION_COOKIE) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }

  return null;
}
