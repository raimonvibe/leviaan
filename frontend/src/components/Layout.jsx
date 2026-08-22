import { NavLink, Outlet } from "react-router";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { Footer } from "./Footer.jsx";
import { Logo } from "./Logo.jsx";

const linkClass = ({ isActive }) =>
  `shrink-0 px-3 min-h-11 inline-flex items-center rounded-md text-sm ${
    isActive
      ? "bg-primary-600 text-white dark:bg-accent-400 dark:text-primary-900"
      : "text-primary-700 dark:text-primary-100"
  }`;

export function Layout() {
  const { user, isEditor, isCreator, isOwner, setRole, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const links = (
    <>
      <NavLink to="/" className={linkClass} end>
        Bord
      </NavLink>
      <NavLink to="/overzicht" className={linkClass}>
        Overzicht
      </NavLink>
      {isEditor ? (
        <>
          <NavLink to="/berichten/nieuw" className={linkClass}>
            Plaatsen
          </NavLink>
          <NavLink to="/prullenbak" className={linkClass}>
            Prullenbak
          </NavLink>
        </>
      ) : null}
      {isCreator ? (
        <NavLink to="/redactie" className={linkClass}>
          Beheer
        </NavLink>
      ) : null}
    </>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-primary-100/70 bg-paper/95 backdrop-blur dark:border-primary-700 dark:bg-primary-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <NavLink to="/" className="min-w-0 shrink rounded-md" aria-label="Naar home">
            <Logo />
          </NavLink>
          <nav className="hidden items-center gap-1 lg:flex">{links}</nav>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              className="btn btn-ghost px-3"
              aria-label={isDark ? "Lichte modus" : "Donkere modus"}
            >
              {isDark ? "Licht" : "Donker"}
            </button>
            {isOwner && !isCreator ? (
              <button
                type="button"
                className="btn btn-brick px-3"
                onClick={() => setRole("creator").catch(() => {})}
              >
                Terug naar beheer
              </button>
            ) : null}
            <p className="hidden max-w-28 truncate text-sm md:block">{user?.username}</p>
            <button type="button" onClick={logout} className="btn btn-ghost px-3">
              Uitloggen
            </button>
          </div>
        </div>
        <nav className="chip-row px-4 pb-2 lg:hidden">{links}</nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        <Outlet />
      </main>
      <div className="pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Footer />
      </div>
    </div>
  );
}
