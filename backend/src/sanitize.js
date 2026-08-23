const EMAIL_RE =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function stripUnsafe(value) {
  return String(value ?? "")
    .replace(/\0/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

export function cleanEmail(value) {
  const email = stripUnsafe(value).trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return null;
  }
  return email;
}

export function allowedOriginsFromEnv(frontendUrl) {
  return String(frontendUrl || "")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
}
