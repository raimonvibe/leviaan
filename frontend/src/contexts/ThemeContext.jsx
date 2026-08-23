import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);
const THEME_KEY = "leviaan_theme";
const LIGHT_CHROME = "#fffbf4";
const DARK_CHROME = "#0b1f3a";

function applyChrome(theme) {
  const dark = theme === "dark";
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute("content", dark ? DARK_CHROME : LIGHT_CHROME);
  const colorScheme = document.querySelector('meta[name="color-scheme"]');
  if (colorScheme) colorScheme.setAttribute("content", dark ? "dark" : "light");
}

// What to show before anyone touches the switch: the choice from last time if
// there is one, otherwise light. A first visit and a cleared store both start
// light, even when the phone or laptop prefers dark.
function firstTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") {
      return stored;
    }
  } catch {
    // Private mode can refuse storage. Light still works for this visit.
  }
  return "light";
}

function remember(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Nothing to remember with. The switch still works for this visit.
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(firstTheme);

  useEffect(() => {
    applyChrome(theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      // Only a real choice is written down. First visit stays light.
      toggleTheme: () => {
        const next = theme === "dark" ? "light" : "dark";
        remember(next);
        setTheme(next);
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
