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

export function toDate(value) {
  return new Date(`${String(value).slice(0, 10)}T00:00:00`);
}

export function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function toInputDate(value) {
  if (!value) return "";
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

export function shiftInputDate(days, from = startOfToday()) {
  const date = from instanceof Date ? new Date(from) : toDate(from);
  date.setDate(date.getDate() + days);
  return toInputDate(date);
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

export function endDateOf(post) {
  return post?.activityEndDate || post?.activityDate;
}

export function friendlyDate(value) {
  if (!value) return "";
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const diff = Math.round((date - startOfToday()) / 86400000);
  if (diff === 0) return "Vandaag";
  if (diff === 1) return "Morgen";
  if (diff === -1) return "Gisteren";
  return formatDate(value);
}

export function formatRange(start, end) {
  const from = start;
  const to = end || start;
  if (!from) return "";
  if (!to || to === from) return friendlyDate(from);
  const a = toDate(from);
  const b = toDate(to);
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
    return `${a.getDate()}–${b.getDate()} ${months[a.getMonth()]} ${a.getFullYear()}`;
  }
  return `${formatDate(from)} – ${formatDate(to)}`;
}

export function isUpcoming(postOrDate) {
  const end = typeof postOrDate === "object" && postOrDate ? endDateOf(postOrDate) : postOrDate;
  if (!end) return false;
  return toDate(end) >= startOfToday();
}

export function isToday(postOrDate) {
  const start = typeof postOrDate === "object" && postOrDate ? postOrDate.activityDate : postOrDate;
  const end = typeof postOrDate === "object" && postOrDate ? endDateOf(postOrDate) : postOrDate;
  const today = toInputDate(startOfToday());
  return start <= today && end >= today;
}

export function weekendRange() {
  const today = startOfToday();
  const day = today.getDay();
  const toSaturday = day === 6 ? 0 : (6 - day + 7) % 7;
  const saturday = new Date(today);
  saturday.setDate(today.getDate() + toSaturday);
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);
  return { start: toInputDate(saturday), end: toInputDate(sunday) };
}

export function weekRange() {
  const today = startOfToday();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toInputDate(monday), end: toInputDate(sunday) };
}

