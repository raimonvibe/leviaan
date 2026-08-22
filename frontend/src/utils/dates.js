const months = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

export function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatShortDate(value) {
  if (!value) return { day: "", month: "" };
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { day: "", month: "" };
  return {
    day: String(date.getDate()),
    month: months[date.getMonth()].slice(0, 3),
  };
}

export function toInputDate(value) {
  return String(value || "").slice(0, 10);
}

export function isUpcoming(value) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return date >= today;
}
