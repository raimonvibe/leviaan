import { NavLink, Outlet } from "react-router";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { Logo } from "./Logo.jsx";

const linkClass = ({ isActive }) =>
  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? "bg-primary-600 text-white dark:bg-accent-400 dark:text-primary-900"
      : "text-primary-700 hover:bg-primary-50 dark:text-primary-100 dark:hover:bg-primary-800"
  }`;

export function Layout() {
  const { user, isEditor, isCreator, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen">
      <header className="border-b border-primary-100 bg-paper/90 backdrop-blur dark:border-primary-700 dark:bg-primary-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <NavLink to="/bord" className="shrink-0">
            <Logo />
          </NavLink>
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/bord" className={linkClass}>
              Bord
            </NavLink>
            <NavLink to="/overzicht" className={linkClass}>
              Overzicht
            </NavLink>
            {isEditor ? (
              <NavLink to="/berichten/nieuw" className={linkClass}>
                Nieuw bericht
              </NavLink>
            ) : null}
            {isCreator ? (
              <NavLink to="/redactie" className={linkClass}>
                Redactie
              </NavLink>
            ) : null}
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="btn btn-secondary px-3"
              aria-label={isDark ? "Schakel naar lichte modus" : "Schakel naar donkere modus"}
            >
              {isDark ? "Licht" : "Donker"}
            </button>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user?.username}</p>
              <p className="text-xs capitalize text-primary-500 dark:text-primary-300">
                {user?.role === "creator" ? "beheerder" : user?.role === "editor" ? "redacteur" : "bezoeker"}
              </p>
            </div>
            <button type="button" onClick={logout} className="btn btn-ghost">
              Uitloggen
            </button>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto px-4 pb-3 md:hidden">
          <NavLink to="/bord" className={linkClass}>
            Bord
          </NavLink>
          <NavLink to="/overzicht" className={linkClass}>
            Overzicht
          </NavLink>
          {isEditor ? (
            <NavLink to="/berichten/nieuw" className={linkClass}>
              Nieuw
            </NavLink>
          ) : null}
          {isCreator ? (
            <NavLink to="/redactie" className={linkClass}>
              Redactie
            </NavLink>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
