export function toPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    role: row.role,
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function isOwnerEmail(email) {
  return Boolean(email) && normalizeEmail(email) === normalizeEmail(process.env.CREATOR_EMAIL);
}

export function toPrivateUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    email: row.email,
    needsUsername: !row.username,
    isOwner: isOwnerEmail(row.email),
  };
}

export function isEditorRole(role) {
  return role === "editor" || role === "creator";
}
