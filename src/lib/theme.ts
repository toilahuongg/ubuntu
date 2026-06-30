export const THEME_STORAGE_KEY = "ubuntu-theme";
export const DEFAULT_THEME = "light";

export type ThemePreference = "light" | "dark";

export type ThemeStorage = Pick<Storage, "getItem" | "setItem">;

export type ThemeDocument = {
  documentElement: {
    classList: Pick<DOMTokenList, "add" | "remove" | "contains">;
  };
};

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark";
}

export function getStoredThemePreference(
  storage: Pick<ThemeStorage, "getItem">,
): ThemePreference {
  const storedTheme = storage.getItem(THEME_STORAGE_KEY);
  return isThemePreference(storedTheme) ? storedTheme : DEFAULT_THEME;
}

export function applyThemePreference(
  documentRef: ThemeDocument,
  theme: ThemePreference,
) {
  const oppositeTheme = theme === "dark" ? "light" : "dark";
  documentRef.documentElement.classList.remove(oppositeTheme);
  documentRef.documentElement.classList.add(theme);
}

export function setStoredThemePreference(
  storage: ThemeStorage,
  documentRef: ThemeDocument,
  theme: ThemePreference,
) {
  storage.setItem(THEME_STORAGE_KEY, theme);
  applyThemePreference(documentRef, theme);
}
