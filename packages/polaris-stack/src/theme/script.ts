import type { PolarisTheme } from "./types";

const DEFAULT_STORAGE_KEY = "polaris-theme";

export function getStoredPolarisTheme(
  storageKey = DEFAULT_STORAGE_KEY,
): PolarisTheme | null {
  try {
    const value = localStorage.getItem(storageKey);
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

export function resolvePolarisTheme(theme: PolarisTheme): "light" | "dark" {
  if (theme === "system") {
    if (typeof matchMedia !== "undefined") {
      return matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  }
  return theme;
}

export function setPolarisTheme(
  theme: PolarisTheme,
  storageKey = DEFAULT_STORAGE_KEY,
): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = resolvePolarisTheme(theme);
  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    // Storage may be unavailable in private mode.
  }
}

export function createPolarisThemeInitScript(options?: {
  storageKey?: string;
  defaultTheme?: PolarisTheme;
}): string {
  const storageKey = options?.storageKey ?? DEFAULT_STORAGE_KEY;
  const defaultTheme = options?.defaultTheme ?? "system";
  return (
    `(function(){try{` +
    `var k=${JSON.stringify(storageKey)};` +
    `var d=${JSON.stringify(defaultTheme)};` +
    `var t=localStorage.getItem(k);` +
    `var m=matchMedia("(prefers-color-scheme: dark)").matches;` +
    `var r=t||(d==="system"?(m?"dark":"light"):d);` +
    `document.documentElement.dataset.theme=r;` +
    `}catch(e){}})();`
  );
}
