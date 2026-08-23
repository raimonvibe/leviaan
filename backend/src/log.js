const EMAIL_IN_TEXT = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const SECRET_KEY = /^(credential|cookie|token|authorization|password|secret|imageData|image_data|jwt)$/i;

/** j.doe@gmail.com → j***@g***.com */
export function redactEmail(email) {
  const value = String(email || "")
    .trim()
    .toLowerCase();
  const at = value.lastIndexOf("@");
  if (at < 1 || at === value.length - 1) return "[redacted]";

  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  const name = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";
  return `${local.slice(0, 1)}***@${name.slice(0, 1)}***${tld}`;
}

export function redactText(value) {
  return String(value ?? "").replace(EMAIL_IN_TEXT, (match) => redactEmail(match));
}

function sanitizeFields(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields || {})) {
    if (value == null || value === "") continue;
    if (SECRET_KEY.test(key)) continue;
    if (/email/i.test(key)) {
      out[key] = redactEmail(value);
      continue;
    }
    if (typeof value === "string") {
      out[key] = redactText(value).slice(0, 240);
      continue;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    }
  }
  return out;
}

export function log(level, event, fields = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...sanitizeFields(fields),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logInfo = (event, fields) => log("info", event, fields);
export const logWarn = (event, fields) => log("warn", event, fields);
export const logError = (event, fields) => log("error", event, fields);
