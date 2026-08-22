import { useMemo, useState } from "react";
import {
  formatRange,
  monthGrid,
  shiftInputDate,
  startOfToday,
  toInputDate,
  weekendRange,
  weekRange,
} from "../utils/dates.js";

export function DateRangePicker({ start, end, onChange }) {
  const today = toInputDate(startOfToday());
  const initial = start ? new Date(`${start}T00:00:00`) : startOfToday();
  const [cursor, setCursor] = useState({ year: initial.getFullYear(), month: initial.getMonth() });
  const [step, setStep] = useState("start");
  const grid = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);

  function selectDay(value) {
    if (step === "start" || !start) {
      onChange({ start: value, end: value });
      setStep("end");
      return;
    }
    if (value < start) {
      onChange({ start: value, end: start });
    } else {
      onChange({ start, end: value });
    }
    setStep("start");
  }

  function moveMonth(delta) {
    const next = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  }

  function inRange(value) {
    if (!start || !end) return false;
    return value >= start && value <= end;
  }

  const shortcuts = [
    { label: "Vandaag", run: () => onChange({ start: today, end: today }) },
    { label: "Morgen", run: () => onChange({ start: shiftInputDate(1), end: shiftInputDate(1) }) },
    { label: "Weekend", run: () => onChange(weekendRange()) },
    { label: "Deze week", run: () => onChange(weekRange()) },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-primary-100 bg-white px-3 py-2 dark:border-primary-600 dark:bg-primary-900">
          <p className="text-xs text-primary-500">Van</p>
          <p className="font-medium">{start ? start.split("-").reverse().join("-") : "—"}</p>
        </div>
        <div className="rounded-md border border-primary-100 bg-white px-3 py-2 dark:border-primary-600 dark:bg-primary-900">
          <p className="text-xs text-primary-500">Tot</p>
          <p className="font-medium">{end ? end.split("-").reverse().join("-") : "—"}</p>
        </div>
      </div>
      <p className="text-sm text-primary-500">
        {step === "end" ? "Kies de einddatum in de kalender." : "Kies de begindatum, daarna de einddatum."}
      </p>
      <div className="rounded-lg border border-primary-100 bg-white p-3 dark:border-primary-600 dark:bg-primary-900">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" className="btn btn-ghost min-h-11 px-3" onClick={() => moveMonth(-1)} aria-label="Vorige maand">
            ‹
          </button>
          <p className="font-serif text-lg capitalize">{grid.label}</p>
          <button type="button" className="btn btn-ghost min-h-11 px-3" onClick={() => moveMonth(1)} aria-label="Volgende maand">
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-primary-500">
          {grid.weekdays.map((day) => (
            <span key={day} className="py-1 uppercase">
              {day}
            </span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.cells.map((value, index) => {
            if (!value) return <span key={`e-${index}`} />;
            const selected = value === start || value === end;
            const between = inRange(value);
            const isToday = value === today;
            return (
              <button
                key={value}
                type="button"
                onClick={() => selectDay(value)}
                className={`min-h-11 rounded-md text-sm ${
                  selected
                    ? "bg-primary-600 text-white dark:bg-accent-400 dark:text-primary-900"
                    : between
                      ? "bg-accent-100 text-primary-800 dark:bg-primary-700 dark:text-accent-200"
                      : "hover:bg-primary-50 dark:hover:bg-primary-800"
                } ${isToday && !selected ? "ring-1 ring-accent-400" : ""}`}
              >
                {Number(value.slice(8))}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {shortcuts.map((item) => (
          <button key={item.label} type="button" className="btn btn-secondary" onClick={item.run}>
            {item.label}
          </button>
        ))}
      </div>
      {start ? <p className="text-sm text-primary-600 dark:text-primary-200">{formatRange(start, end)}</p> : null}
    </div>
  );
}
