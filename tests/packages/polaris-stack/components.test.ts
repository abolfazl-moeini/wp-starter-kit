/** @jest-environment jsdom */
import { describe, test, expect, beforeAll } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { h, render } from "preact";

const COMPONENTS_CSS = readFileSync(
  join(process.cwd(), "packages/polaris-stack/src/components/components.css"),
  "utf8",
);
const TOKENS_CSS = readFileSync(
  join(process.cwd(), "packages/polaris-stack/src/theme/tokens.css"),
  "utf8",
);
const THEMES_CSS = readFileSync(
  join(process.cwd(), "packages/polaris-stack/src/theme/themes.css"),
  "utf8",
);

function extractTokenNames(css: string): Set<string> {
  const tokens = new Set<string>();
  for (const match of css.matchAll(/var\((--ps-[^),]+)/g)) {
    tokens.add(match[1].trim());
  }
  return tokens;
}

function extractDefinedTokens(...files: string[]): Set<string> {
  const tokens = new Set<string>();
  for (const css of files) {
    for (const match of css.matchAll(/(--ps-[\w-]+)\s*:/g)) {
      tokens.add(match[1]);
    }
  }
  return tokens;
}

const POLARIS_DIST = join(
  process.cwd(),
  "packages/polaris-stack/dist/index.js",
);

let Button;
let Card;
let Text;
let Heading;
let Badge;
let Alert;
let Spinner;
let Kbd;
let IconButton;

beforeAll(() => {
  if (!existsSync(POLARIS_DIST)) {
    execSync("npm run build", {
      cwd: join(process.cwd(), "packages/polaris-stack"),
      stdio: "pipe",
    });
  }
  const polaris = require(POLARIS_DIST);
  ({ Button, Card, Text, Heading, Badge, Alert, Spinner, Kbd, IconButton } =
    polaris);
});

describe("polaris-stack components.css", () => {
  test("uses design tokens via CSS variables", () => {
    expect(COMPONENTS_CSS).toContain("var(--ps-color-primary)");
    expect(COMPONENTS_CSS).toContain("var(--ps-color-fg)");
    expect(COMPONENTS_CSS).toContain("var(--ps-space-");
  });

  test("button includes focus-visible style", () => {
    expect(COMPONENTS_CSS).toContain(":focus-visible");
    expect(COMPONENTS_CSS).toContain("prefers-reduced-motion");
  });

  test("every var(--ps-*) in components.css resolves to a defined token", () => {
    const referenced = extractTokenNames(COMPONENTS_CSS);
    const defined = extractDefinedTokens(TOKENS_CSS, THEMES_CSS);
    for (const token of referenced) {
      expect(defined.has(token)).toBe(true);
    }
  });
});

describe("polaris-stack component render", () => {
  test("Button renders with variant and size classes", () => {
    const root = document.createElement("div");
    render(h(Button, { variant: "soft", size: "sm" }, "Save"), root);
    const btn = root.querySelector(".ps-button");
    expect(btn?.classList.contains("ps-button-soft")).toBe(true);
    expect(btn?.classList.contains("ps-button-sm")).toBe(true);
  });

  test("Button as anchor renders without type attribute", () => {
    const root = document.createElement("div");
    render(h(Button, { as: "a", href: "#" }, "Link"), root);
    const link = root.querySelector("a.ps-button");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("type")).toBeNull();
  });

  test("Card renders with elevation and interactive classes", () => {
    const root = document.createElement("div");
    render(h(Card, { elevation: 3, interactive: true }, "content"), root);
    const card = root.querySelector(".ps-card");
    expect(card?.classList.contains("ps-card-elevation-3")).toBe(true);
    expect(card?.classList.contains("ps-card-interactive")).toBe(true);
  });

  test("Text renders with tone and truncate", () => {
    const root = document.createElement("div");
    render(h(Text, { tone: "muted", truncate: true }, "label"), root);
    const text = root.querySelector(".ps-text");
    expect(text?.classList.contains("ps-text-tone-muted")).toBe(true);
    expect(text?.classList.contains("ps-text-truncate")).toBe(true);
  });

  test("Heading decouples size from level", () => {
    const root = document.createElement("div");
    render(h(Heading, { level: 2, size: "xl" }, "Title"), root);
    const heading = root.querySelector("h2.ps-heading");
    expect(heading?.classList.contains("ps-heading-1")).toBe(true);
  });

  test("Badge renders with tone class", () => {
    const root = document.createElement("div");
    render(h(Badge, { tone: "success" }, "OK"), root);
    expect(root.querySelector(".ps-badge-success")).not.toBeNull();
  });

  test("Alert renders with role status", () => {
    const root = document.createElement("div");
    render(h(Alert, { tone: "warning" }, "Heads up"), root);
    const alert = root.querySelector(".ps-alert-warning");
    expect(alert?.getAttribute("role")).toBe("status");
  });

  test("Spinner renders with aria-label", () => {
    const root = document.createElement("div");
    render(h(Spinner, { label: "Busy" }), root);
    const spinner = root.querySelector(".ps-spinner");
    expect(spinner?.getAttribute("aria-label")).toBe("Busy");
  });

  test("Kbd renders with ps-kbd class", () => {
    const root = document.createElement("div");
    render(h(Kbd, null, "⌘K"), root);
    expect(root.querySelector(".ps-kbd")).not.toBeNull();
  });

  test("IconButton renders with aria-label", () => {
    const root = document.createElement("div");
    render(h(IconButton, { label: "Close" }, "×"), root);
    const btn = root.querySelector(".ps-button-icon-only");
    expect(btn?.getAttribute("aria-label")).toBe("Close");
  });
});
