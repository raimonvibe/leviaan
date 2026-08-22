export function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 56 56" className="h-10 w-10 shrink-0" aria-hidden="true">
        <rect width="56" height="56" rx="8" className="fill-primary-600 dark:fill-accent-400" />
        <path d="M10 40 V16 h10 l8 14 8-14 h10 v24 h-8 V26 l-8 12-8-12 v14z" className="fill-accent-400 dark:fill-primary-800" />
      </svg>
      {compact ? null : (
        <div className="leading-tight">
          <p className="font-serif text-lg font-semibold tracking-tight">Leviaan Campus</p>
          <p className="text-xs uppercase tracking-[0.18em] text-primary-500 dark:text-accent-300">
            Activiteitenbord
          </p>
        </div>
      )}
    </div>
  );
}
