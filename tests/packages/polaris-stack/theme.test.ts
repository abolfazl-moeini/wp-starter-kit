/** @jest-environment jsdom */
import { describe, test, expect, beforeEach } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  setPolarisTheme,
  getStoredPolarisTheme,
  resolvePolarisTheme,
  createPolarisThemeInitScript,
} from "../../../packages/polaris-stack/src/theme/script";

const ROOT = join(process.cwd(), "packages/polaris-stack");

describe("polaris-stack theme", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    localStorage.clear();
  });

  test("dist/styles.css contract includes token variables", () => {
    const css = readFileSync(join(ROOT, "src/theme/tokens.css"), "utf8");
    expect(css).toContain("--ps-color-bg");
    expect(css).toContain("--ps-color-fg");
    expect(css).not.toContain("@emotion");
  });

  test("themes.css includes dark selector", () => {
    const css = readFileSync(join(ROOT, "src/theme/themes.css"), "utf8");
    expect(css).toContain('[data-theme="dark"]');
  });

  test("setPolarisTheme(dark) sets dataset.theme only", () => {
    setPolarisTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(getStoredPolarisTheme()).toBe("dark");
  });

  test("resolvePolarisTheme(system) follows prefers-color-scheme", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: query.includes("dark"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });
    expect(resolvePolarisTheme("system")).toBe("dark");
  });

  test("createPolarisThemeInitScript returns inline-safe snippet", () => {
    const script = createPolarisThemeInitScript();
    expect(script).toMatch(/document\.documentElement\.dataset\.theme/);
    expect(script).not.toContain("import ");
  });
});
