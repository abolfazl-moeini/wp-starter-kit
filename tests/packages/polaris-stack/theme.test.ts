/** @jest-environment jsdom */
import { describe, test, expect, beforeEach, beforeAll } from "@jest/globals";
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

describe("polaris-stack dark theme contrast (WCAG AA)", () => {
  // Acceptance criterion from improve.plan.md §5: "The dark theme passes
  // WCAG AA on all token-pair combinations used by the shipped components."
  // These are the fg/bg pairs the components actually compose (Button,
  // Badge, Alert, Card text, …).
  const AA_NORMAL_TEXT = 4.5;

  function relativeLuminance(hex: string): number {
    const channels = [0, 2, 4].map(
      (i) => parseInt(hex.replace("#", "").slice(i, i + 2), 16) / 255,
    );
    const [r, g, b] = channels.map((v) =>
      v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4),
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrastRatio(a: string, b: string): number {
    const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)].sort(
      (x, y) => y - x,
    );
    return (l1 + 0.05) / (l2 + 0.05);
  }

  function extractThemeTokens(
    css: string,
    selector: string,
  ): Map<string, string> {
    const start = css.indexOf(selector);
    const blockStart = css.indexOf("{", start);
    const blockEnd = css.indexOf("}", blockStart);
    const block = css.slice(blockStart + 1, blockEnd);
    const tokens = new Map<string, string>();
    for (const match of block.matchAll(
      /(--ps-[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})/g,
    )) {
      tokens.set(match[1], match[2]);
    }
    return tokens;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dark: any;
  beforeAll(() => {
    const css = readFileSync(join(ROOT, "src/theme/themes.css"), "utf8");
    dark = extractThemeTokens(css, '[data-theme="dark"]');
  });

  const PAIRS: Array<[string, string]> = [
    ["--ps-color-fg", "--ps-color-bg"],
    ["--ps-color-fg", "--ps-color-muted"],
    ["--ps-color-primary-fg", "--ps-color-primary"],
    ["--ps-color-soft-fg", "--ps-color-soft"],
    ["--ps-color-success-fg", "--ps-color-success"],
    ["--ps-color-danger-fg", "--ps-color-danger"],
    ["--ps-color-warning-fg", "--ps-color-warning"],
    ["--ps-color-info-fg", "--ps-color-info"],
  ];

  test.each(PAIRS)(
    "%s on %s meets WCAG AA (4.5:1) in the dark theme",
    (fg, bg) => {
      const fgValue = dark.get(fg);
      const bgValue = dark.get(bg);
      expect(fgValue).toBeDefined();
      expect(bgValue).toBeDefined();
      const ratio = contrastRatio(fgValue, bgValue);
      expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    },
  );
});

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

  test("createPolarisThemeInitScript ignores invalid stored theme", () => {
    localStorage.setItem("polaris-theme", "banana");
    mockMatchMedia(false);
    // eslint-disable-next-line no-eval
    eval(createPolarisThemeInitScript());
    // Falls back to the resolved default instead of an unknown data-theme.
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
