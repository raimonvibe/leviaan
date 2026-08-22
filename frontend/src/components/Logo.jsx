export function Logo({ compact = false }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <img
        src="/leviaan-logo.png"
        alt=""
        width="595"
        height="419"
        className="h-10 w-auto shrink-0 rounded-md sm:h-11"
      />
      {compact ? null : (
        <div className="min-w-0 leading-tight max-[380px]:hidden">
          <p className="truncate font-serif text-base font-semibold text-ink sm:text-lg">Leviaan Campus</p>
          <p className="hidden text-[0.65rem] uppercase tracking-[0.16em] text-primary-500 sm:block dark:text-accent-300">
            Activiteitenbord
          </p>
        </div>
      )}
    </div>
  );
}
