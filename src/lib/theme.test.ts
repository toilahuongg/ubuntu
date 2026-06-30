import { describe, expect, test } from "vitest";

import {
  DEFAULT_THEME,
  applyThemePreference,
  getStoredThemePreference,
  setStoredThemePreference,
} from "./theme";

function createDocument(classNames: string[] = []) {
  const classList = new Set(classNames);

  return {
    documentElement: {
      classList: {
        add: (...tokens: string[]) => {
          tokens.forEach((token) => classList.add(token));
        },
        remove: (...tokens: string[]) => {
          tokens.forEach((token) => classList.delete(token));
        },
        contains: (token: string) => classList.has(token),
      },
    },
  };
}

function createStorage(initial?: string) {
  let value = initial ?? null;

  return {
    getItem: () => value,
    setItem: (_key: string, nextValue: string) => {
      value = nextValue;
    },
  };
}

describe("theme preference", () => {
  test("defaults to light when no user preference is stored", () => {
    expect(getStoredThemePreference(createStorage())).toBe(DEFAULT_THEME);
  });

  test("ignores unsupported stored values instead of falling back to system theme", () => {
    expect(getStoredThemePreference(createStorage("system"))).toBe(DEFAULT_THEME);
    expect(getStoredThemePreference(createStorage("unexpected"))).toBe(DEFAULT_THEME);
  });

  test("applies only the user selected theme class", () => {
    const document = createDocument(["light"]);

    applyThemePreference(document, "dark");

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  test("persists the explicit user selection before applying it", () => {
    const document = createDocument(["dark"]);
    const storage = createStorage();

    setStoredThemePreference(storage, document, "light");

    expect(getStoredThemePreference(storage)).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
