import { Link } from "react-router";

const links = [
  { href: "https://www.leviaan.nl", label: "leviaan.nl", external: true },
  { href: "https://github.com/raimonvibe/leviaan", label: "Bekijk de code!", external: true },
  { to: "/google-account", label: "Hoe maak ik een Google-account?" },
  { to: "/privacy", label: "Privacy" },
];

export function Footer({ light = false }) {
  const tone = light
    ? "border-white/15 text-primary-100"
    : "border-primary-200 text-primary-600 dark:border-primary-400 dark:text-primary-200";
  const linkClass = light
    ? "inline-flex min-h-12 w-full items-center rounded-md border border-white/20 px-3 py-2 text-sm underline decoration-accent-400/70 underline-offset-4 hover:bg-white/10 hover:text-white"
    : "inline-flex min-h-12 w-full items-center rounded-md border border-primary-200 px-3 py-2 text-sm underline decoration-accent-400 underline-offset-4 hover:bg-primary-50 hover:text-primary-800 dark:border-primary-400 dark:hover:bg-primary-700 dark:hover:text-accent-200";

  return (
    <footer className={`mt-auto border-t ${tone}`}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] short:gap-4 short:py-4 short:pb-[max(1rem,env(safe-area-inset-bottom))] lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-md">
          <p className="font-serif text-lg text-inherit">Leviaan Campus</p>
          <p className={`mt-1 text-sm ${light ? "text-primary-200" : "text-primary-500 dark:text-primary-300"}`}>
            Het activiteitenbord van dit huis. Meer over Leviaan staat op hun website.
          </p>
        </div>
        <nav
          className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:max-w-2xl"
          aria-label="Links onderaan"
        >
          {links.map((item) =>
            item.external ? (
              <a
                key={item.label}
                href={item.href}
                className={linkClass}
                target="_blank"
                rel="noreferrer"
              >
                {item.label}
              </a>
            ) : (
              <Link key={item.to} to={item.to} className={linkClass}>
                {item.label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </footer>
  );
}
