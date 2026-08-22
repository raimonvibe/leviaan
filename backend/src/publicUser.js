export function toPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    role: row.role,
  };
}

export function toPrivateUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    email: row.email,
    needsUsername: !row.username,
  };
}

export function isEditorRole(role) {
  return role === "editor" || role === "creator";
}
