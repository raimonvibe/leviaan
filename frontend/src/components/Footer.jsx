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
    ? "inline-flex min-h-11 items-center rounded-md px-2.5 text-sm underline decoration-accent-400/70 underline-offset-4 hover:bg-white/10 hover:text-white"
    : "inline-flex min-h-11 items-center rounded-md px-2.5 text-sm underline decoration-accent-400 underline-offset-4 hover:bg-primary-50 hover:text-primary-800 dark:hover:bg-primary-700 dark:hover:text-accent-200";

  return (
    <footer className={`mt-auto border-t ${tone}`}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="font-serif text-base text-inherit">Leviaan Campus</p>
        <nav
          className="flex flex-wrap items-center gap-x-1 gap-y-0.5"
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
