"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import {
  DEFAULT_THEME,
  applyThemePreference,
  getStoredThemePreference,
  setStoredThemePreference,
  type ThemePreference,
} from "@/lib/theme";

const THEME_CHANGE_EVENT = "ubuntu-theme-change";

const OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  Icon: typeof Sun;
}> = [
  { value: "light", label: "Chế độ sáng", Icon: Sun },
  { value: "dark", label: "Chế độ tối", Icon: Moon },
];

function getThemeSnapshot(): ThemePreference {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }

  return getStoredThemePreference(window.localStorage);
}

function subscribeThemeChange(onStoreChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeThemeChange,
    getThemeSnapshot,
    (): ThemePreference => DEFAULT_THEME,
  );

  useEffect(() => {
    applyThemePreference(document, theme);
  }, [theme]);

  function handleThemeChange(nextTheme: ThemePreference) {
    setStoredThemePreference(window.localStorage, document, nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <div
      aria-label="Chọn giao diện"
      className="inline-grid h-9 grid-cols-2 overflow-hidden rounded-lg border border-border bg-background/80"
      role="group"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = value === theme;

        return (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={isActive}
            title={label}
            onClick={() => handleThemeChange(value)}
            className={`inline-flex h-9 w-9 items-center justify-center transition-colors ${
              isActive
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
