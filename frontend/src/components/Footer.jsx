import { Link } from "react-router";

export function Footer({ light = false }) {
  const tone = light
    ? "border-white/15 text-primary-100"
    : "border-primary-100/80 text-primary-600 dark:border-primary-700 dark:text-primary-300";
  const link = light
    ? "underline decoration-accent-400/70 underline-offset-4 hover:text-white"
    : "underline decoration-accent-400 underline-offset-4 hover:text-primary-800 dark:hover:text-accent-200";

  return (
    <footer className={`mt-auto border-t ${tone}`}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-md">
          <p className="font-serif text-lg text-inherit">Leviaan Campus</p>
          <p className={`mt-1 text-sm ${light ? "text-primary-200" : "text-primary-500 dark:text-primary-300"}`}>
            Een rustig bord voor activiteiten thuis. Meer over Leviaan vind je op hun site.
          </p>
        </div>
        <nav className="flex flex-col gap-2 text-sm sm:items-end">
          <a href="https://www.leviaan.nl" className={link} target="_blank" rel="noreferrer">
            leviaan.nl
          </a>
          <Link to="/privacy" className={link}>
            Privacy-verklaring
          </Link>
        </nav>
      </div>
    </footer>
  );
}
