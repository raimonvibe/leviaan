import { formatRange, shiftInputDate, startOfToday, toInputDate, weekendRange, weekRange } from "../utils/dates.js";

export function DateRangePicker({ start, end, onChange }) {
  const today = toInputDate(startOfToday());
  const sameDay = Boolean(start) && start === end;

  function setStart(value) {
    if (!value) return;
    if (!end || sameDay || value > end) {
      onChange({ start: value, end: value });
      return;
    }
    onChange({ start: value, end });
  }

  function setEnd(value) {
    if (!value) return;
    if (!start || value < start) {
      onChange({ start: value, end: value });
      return;
    }
    onChange({ start, end: value });
  }

  const shortcuts = [
    { label: "Vandaag", run: () => onChange({ start: today, end: today }) },
    { label: "Morgen", run: () => onChange({ start: shiftInputDate(1), end: shiftInputDate(1) }) },
    { label: "Weekend", run: () => onChange(weekendRange()) },
    { label: "Deze week", run: () => onChange(weekRange()) },
  ];

  return (
    <div className="min-w-0 w-full space-y-3">
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block min-w-0">
          <span className="label">Van</span>
          <input
            type="date"
            className="input"
            value={start}
            max={sameDay ? undefined : end || undefined}
            onChange={(event) => setStart(event.target.value)}
            required
          />
        </label>
        <label className="block min-w-0">
          <span className="label">Tot</span>
          <input
            type="date"
            className="input"
            value={end || start}
            min={start || undefined}
            onChange={(event) => setEnd(event.target.value)}
            required
          />
        </label>
      </div>
      <p className="text-sm text-primary-600 dark:text-primary-200">
        Duurt het één dag? Kies alleen de eerste datum. Langer? Vul daarna de tweede datum in.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {shortcuts.map((item) => (
          <button
            key={item.label}
            type="button"
            className="btn btn-secondary w-full min-w-0 px-2"
            onClick={item.run}
          >
            {item.label}
          </button>
        ))}
      </div>
      {start ? <p className="text-sm text-primary-600 dark:text-primary-200">{formatRange(start, end)}</p> : null}
    </div>
  );
}
