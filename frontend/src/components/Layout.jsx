import { useEffect, useId, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { useAuth } from "../contexts/AuthContext.jsx";
import { Footer } from "./Footer.jsx";
import { Logo } from "./Logo.jsx";
import { ThemeToggle } from "./ThemeToggle.jsx";

const desktopLinkClass = ({ isActive }) =>
  `shrink-0 px-3 min-h-11 inline-flex items-center rounded-md text-sm ${
    isActive
      ? "bg-primary-600 text-white dark:bg-accent-400 dark:text-primary-900"
      : "text-primary-700 dark:text-primary-100"
  }`;

const mobileLinkClass = ({ isActive }) =>
  `flex min-h-12 items-center rounded-md px-3 text-base ${
    isActive
      ? "bg-primary-600 text-white dark:bg-accent-400 dark:text-primary-900"
      : "text-primary-700 hover:bg-primary-50 dark:text-primary-100 dark:hover:bg-primary-700"
  }`;

function MenuIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      {open ? (
        <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
      ) : (
        <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
      )}
    </svg>
  );
}

function NavLinks({ className, onNavigate, isEditor }) {
  return (
    <>
      <NavLink to="/" className={className} end onClick={onNavigate}>
        Bord
      </NavLink>
      <NavLink to="/overzicht" className={className} onClick={onNavigate}>
        Overzicht
      </NavLink>
      <NavLink to="/naam" className={className} onClick={onNavigate}>
        Naam
      </NavLink>
      {isEditor ? (
        <>
          <NavLink to="/berichten/nieuw" className={className} onClick={onNavigate}>
            Plaatsen
          </NavLink>
          <NavLink to="/prullenbak" className={className} onClick={onNavigate}>
            Prullenbak
          </NavLink>
          <NavLink to="/redactie" className={className} onClick={onNavigate}>
            Beheer
          </NavLink>
        </>
      ) : null}
    </>
  );
}

export function Layout() {
  const { user, isEditor, isCreator, isOwner, canSwitchRole, setRole, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function onKey(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    function onResize() {
      if (window.innerWidth >= 1024) setMenuOpen(false);
    }

    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  const roleButtons = (
    <>
      {isOwner && !isCreator ? (
        <button
          type="button"
          className="btn btn-brick w-full justify-start px-3 lg:w-auto"
          onClick={() => {
            setRole("creator").catch(() => {});
            closeMenu();
          }}
        >
          Terug naar beheer
        </button>
      ) : null}
      {canSwitchRole && !isOwner && isEditor ? (
        <button
          type="button"
          className="btn btn-ghost w-full justify-start px-3 lg:w-auto"
          onClick={() => {
            setRole("visitor").catch(() => {});
            closeMenu();
          }}
        >
          Kijk als bewoner
        </button>
      ) : null}
      {canSwitchRole && !isOwner && !isEditor ? (
        <button
          type="button"
          className="btn btn-brick w-full justify-start px-3 lg:w-auto"
          onClick={() => {
            setRole("editor").catch(() => {});
            closeMenu();
          }}
        >
          Terug naar begeleider
        </button>
      ) : null}
    </>
  );

  return (
    <div className="flex min-h-dvh min-w-0 flex-col">
      <header className="sticky top-0 z-40 border-b border-primary-200 bg-paper/95 backdrop-blur dark:border-primary-400 dark:bg-primary-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <NavLink to="/" className="min-w-0 shrink rounded-md" aria-label="Naar home">
            <Logo />
          </NavLink>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Hoofdmenu">
            <NavLinks className={desktopLinkClass} isEditor={isEditor} />
          </nav>
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <div className="hidden items-center gap-1 lg:flex">
              {roleButtons}
              <NavLink
                to="/naam"
                className="hidden max-w-28 truncate text-sm text-ink underline decoration-accent-400/70 underline-offset-4 xl:block"
              >
                {user?.username}
              </NavLink>
              <button type="button" onClick={logout} className="btn btn-ghost px-3">
                Uitloggen
              </button>
            </div>
            <button
              type="button"
              className="btn btn-ghost px-3 lg:hidden"
              aria-label={menuOpen ? "Menu sluiten" : "Menu openen"}
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MenuIcon open={menuOpen} />
              <span className="max-[360px]:hidden">Menu</span>
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div
            id={menuId}
            className="border-t border-primary-200 lg:hidden dark:border-primary-400"
          >
            <nav
              className="mx-auto flex max-h-[min(32rem,calc(100dvh-5.5rem))] max-w-6xl flex-col gap-1 overflow-y-auto px-4 py-3"
              aria-label="Hoofdmenu"
            >
              <NavLinks className={mobileLinkClass} onNavigate={closeMenu} isEditor={isEditor} />
              <div className="my-2 border-t border-primary-200 dark:border-primary-400" />
              {user?.username ? (
                <NavLink to="/naam" className={mobileLinkClass} onClick={closeMenu}>
                  Ingelogd als {user.username}
                </NavLink>
              ) : null}
              {roleButtons}
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  logout();
                }}
                className="btn btn-ghost w-full justify-start px-3"
              >
                Uitloggen
              </button>
            </nav>
          </div>
        ) : null}
      </header>

      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 top-0 z-30 bg-primary-900/40 lg:hidden"
          aria-label="Menu sluiten"
          onClick={closeMenu}
        />
      ) : null}

      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-6 sm:py-8">
        <Outlet />
      </main>
      <div className="pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Footer />
      </div>
    </div>
  );
}
