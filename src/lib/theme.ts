// Lightweight theme manager. Reads/writes localStorage and toggles the `dark`
// class on <html>. Includes an inline script string to run before hydration so
// the page does not flash the wrong theme.

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "stockly.theme";

export const themeInitScript = `(() => { try {
  const t = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = t ? t === 'dark' : prefersDark;
  if (dark) document.documentElement.classList.add('dark');
} catch (_) {} })();`;

export function getTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function toggleTheme() {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}
