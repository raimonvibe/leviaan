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

function toDate(value) {
  return new Date(`${String(value).slice(0, 10)}T00:00:00`);
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function formatDate(value) {
  if (!value) return "";
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatShortDate(value) {
  if (!value) return { day: "", month: "" };
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return { day: "", month: "" };
  return {
    day: String(date.getDate()),
    month: months[date.getMonth()].slice(0, 3),
  };
}

export function friendlyDate(value) {
  if (!value) return "";
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const today = startOfToday();
  const diff = Math.round((date - today) / 86400000);
  if (diff === 0) return "Vandaag";
  if (diff === 1) return "Morgen";
  if (diff === -1) return "Gisteren";
  return formatDate(value);
}

export function toInputDate(value) {
  return String(value || "").slice(0, 10);
}

export function shiftInputDate(days) {
  const date = startOfToday();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isUpcoming(value) {
  const date = toDate(value);
  return date >= startOfToday();
}

export function isToday(value) {
  return friendlyDate(value) === "Vandaag";
}
