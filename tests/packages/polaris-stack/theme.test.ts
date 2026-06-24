/** @jest-environment jsdom */
import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  setPolarisTheme,
  getStoredPolarisTheme,
  resolvePolarisTheme,
  createPolarisThemeInitScript,
  subscribePolarisTheme,
  POLARIS_THEME_CHANGE,
} from "../../../packages/polaris-stack/src/theme/script";

const ROOT = join(process.cwd(), "packages/polaris-stack");

function mockMatchMedia(dark: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: dark && query.includes("dark"),
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
  });
}

describe("polaris-stack theme", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    localStorage.clear();
    mockMatchMedia(false);
  });

  test("dist/styles.css contract includes token variables", () => {
    const css = readFileSync(join(ROOT, "src/theme/tokens.css"), "utf8");
    expect(css).toContain("--ps-color-bg");
    expect(css).toContain("--ps-color-success");
    expect(css).toContain("--ps-z-modal");
    expect(css).not.toContain("@emotion");
  });

  test("themes.css includes dark and high-contrast selectors", () => {
    const css = readFileSync(join(ROOT, "src/theme/themes.css"), "utf8");
    expect(css).toContain('[data-theme="dark"]');
    expect(css).toContain('[data-theme="hc"]');
    expect(css).toContain("forced-colors");
  });

  test("setPolarisTheme(dark) sets dataset.theme and storage", () => {
    setPolarisTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(getStoredPolarisTheme()).toBe("dark");
  });

  test("setPolarisTheme(hc) sets high-contrast theme", () => {
    setPolarisTheme("hc");
    expect(document.documentElement.dataset.theme).toBe("hc");
  });

  test("resolvePolarisTheme(system) follows prefers-color-scheme", () => {
    mockMatchMedia(true);
    expect(resolvePolarisTheme("system")).toBe("dark");
    mockMatchMedia(false);
    expect(resolvePolarisTheme("system")).toBe("light");
  });

  test("setPolarisTheme dispatches themechange event", () => {
    const handler = jest.fn();
    document.addEventListener(POLARIS_THEME_CHANGE, handler);
    setPolarisTheme("dark");
    expect(handler).toHaveBeenCalled();
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail.theme).toBe("dark");
  });

  test("subscribePolarisTheme notifies on theme change", () => {
    const onChange = jest.fn();
    const unsubscribe = subscribePolarisTheme(onChange);
    expect(onChange).toHaveBeenCalledWith("light");
    setPolarisTheme("dark");
    expect(onChange).toHaveBeenCalledWith("dark");
    unsubscribe();
  });

  test("setPolarisTheme swallows localStorage errors", () => {
    const setItem = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota");
      });
    expect(() => setPolarisTheme("dark")).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe("dark");
    setItem.mockRestore();
  });

  test("createPolarisThemeInitScript returns inline-safe snippet", () => {
    const script = createPolarisThemeInitScript();
    expect(script).toMatch(/document\.documentElement\.dataset\.theme/);
    expect(script).not.toContain("import ");
  });

  test("createPolarisThemeInitScript resolves stored system preference", () => {
    localStorage.setItem("polaris-theme", "system");
    mockMatchMedia(true);
    // eslint-disable-next-line no-eval
    eval(createPolarisThemeInitScript());
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
