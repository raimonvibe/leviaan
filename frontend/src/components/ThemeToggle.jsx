import { useTheme } from "../contexts/ThemeContext.jsx";

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 3v2.2M12 18.8V21M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M3 12h2.2M18.8 12H21M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.5 15.2A7.2 7.2 0 0 1 9.4 5.8 7.3 7.3 0 1 0 17.5 15.2Z"
      />
    </svg>
  );
}

export function ThemeToggle({ className = "btn btn-ghost shrink-0 px-3" }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={className}
      aria-label={isDark ? "Lichte modus" : "Donkere modus"}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
      {isDark ? "Licht" : "Donker"}
    </button>
  );
}
