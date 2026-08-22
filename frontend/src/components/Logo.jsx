export function Logo({ compact = false }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <svg viewBox="0 0 56 56" className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" aria-hidden="true">
        <rect width="56" height="56" rx="8" className="fill-primary-600 dark:fill-accent-400" />
        <path d="M10 40 V16 h10 l8 14 8-14 h10 v24 h-8 V26 l-8 12-8-12 v14z" className="fill-accent-400 dark:fill-primary-800" />
      </svg>
      {compact ? null : (
        <div className="min-w-0 leading-tight">
          <p className="truncate font-serif text-base font-semibold sm:text-lg">Leviaan Campus</p>
          <p className="hidden text-[0.65rem] uppercase tracking-[0.16em] text-primary-500 sm:block dark:text-accent-300">
            Activiteitenbord
          </p>
        </div>
      )}
    </div>
  );
}
