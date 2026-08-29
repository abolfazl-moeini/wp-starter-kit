/** @jest-environment jsdom */
import { describe, test, expect, beforeAll } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { h, render } from "preact";

const ROOT = join(process.cwd(), "packages/polaris-stack/src/layout");
const LAYOUT_CSS = readFileSync(join(ROOT, "layout.css"), "utf8");
const TOKENS_CSS = readFileSync(
  join(process.cwd(), "packages/polaris-stack/src/theme/tokens.css"),
  "utf8",
);
const BOX_TSX = readFileSync(join(ROOT, "Box.tsx"), "utf8");

const FORBIDDEN = [
  "color:",
  "background",
  "font-family",
  "font-size",
  "border:",
  "border-radius",
  "box-shadow",
];

function extractTokenNames(css: string): Set<string> {
  const tokens = new Set<string>();
  for (const match of css.matchAll(/var\((--ps-[^),]+)/g)) {
    tokens.add(match[1].trim());
  }
  return tokens;
}

function extractDefinedTokens(css: string): Set<string> {
  const tokens = new Set<string>();
  for (const match of css.matchAll(/(--ps-[\w-]+)\s*:/g)) {
    tokens.add(match[1]);
  }
  return tokens;
}

const POLARIS_DIST = join(
  process.cwd(),
  "packages/polaris-stack/dist/index.js",
);

// Loaded from CJS dist in beforeAll — typed loosely for tsc/noImplicitAny.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Divider: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Container: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Cover: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Frame: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Reel: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Imposter: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Switcher: any;

beforeAll(() => {
  if (!existsSync(POLARIS_DIST)) {
    execSync("npm run build", {
      cwd: join(process.cwd(), "packages/polaris-stack"),
      stdio: "pipe",
    });
  }
  const polaris = require(POLARIS_DIST);
  ({ Divider, Container, Cover, Frame, Reel, Imposter, Switcher } = polaris);
});

describe("polaris-stack layout.css", () => {
  test("defines layout primitive classes", () => {
    expect(LAYOUT_CSS).toContain(".ps-stack");
    expect(LAYOUT_CSS).toContain(".ps-cluster");
    expect(LAYOUT_CSS).toContain(".ps-grid");
    expect(LAYOUT_CSS).toContain(".ps-divider");
    expect(LAYOUT_CSS).toContain(".ps-reel");
    expect(LAYOUT_CSS).toContain(".ps-imposter");
  });

  test("does not set visual styling properties", () => {
    const withoutDivider = LAYOUT_CSS.replace(
      /\.ps-divider[\s\S]*?(?=\n\.ps-|\n\/\*|$)/,
      "",
    );
    for (const rule of FORBIDDEN) {
      expect(withoutDivider).not.toContain(rule);
    }
  });

  test("Box sets spacing via CSS custom properties only", () => {
    expect(BOX_TSX).toContain('"--ps-p"');
    expect(BOX_TSX).toContain('"--ps-px"');
    expect(BOX_TSX).not.toMatch(/s\.padding\b/);
    expect(LAYOUT_CSS).toContain("--ps-p: initial");
    expect(LAYOUT_CSS).toContain("padding-block-start: var(--ps-pt,");
    expect(LAYOUT_CSS).toContain("padding-inline-start: var(--ps-pl,");
  });

  test("Switcher limit uses nth-child overflow rules", () => {
    expect(LAYOUT_CSS).toContain(
      '.ps-switcher[data-limit="4"] > :nth-child(n + 5)',
    );
    expect(LAYOUT_CSS).not.toContain("flex-grow: 0");
  });

  test("every var(--ps-*) in layout.css is defined in tokens.css", () => {
    const referenced = extractTokenNames(LAYOUT_CSS);
    const defined = extractDefinedTokens(TOKENS_CSS);
    const allowedLayoutOnly = new Set([
      "--ps-p",
      "--ps-px",
      "--ps-py",
      "--ps-pt",
      "--ps-pr",
      "--ps-pb",
      "--ps-pl",
      "--ps-gap",
      "--ps-justify",
      "--ps-align",
      "--ps-max",
      "--ps-gutters",
      "--ps-min",
      "--ps-side-width",
      "--ps-content-min",
      "--ps-threshold",
      "--ps-divider-size",
      "--ps-divider-line",
      "--ps-cover-min",
      "--ps-frame-ratio",
      "--ps-imposter-position",
    ]);
    for (const token of referenced) {
      const ok = defined.has(token) || allowedLayoutOnly.has(token);
      expect(ok).toBe(true);
    }
  });
});

describe("polaris-stack layout render", () => {
  test("Divider renders with ps-divider class", () => {
    const root = document.createElement("div");
    render(h(Divider, null), root);
    expect(root.querySelector(".ps-divider")).not.toBeNull();
  });

  test("Container renders with max CSS var", () => {
    const root = document.createElement("div");
    render(h(Container, { max: "40rem" }, "content"), root);
    const el = root.querySelector(".ps-container") as HTMLElement | null;
    expect(el).not.toBeNull();
    expect(el?.style.getPropertyValue("--ps-max")).toBe("40rem");
  });

  test("Cover renders with ps-cover class", () => {
    const root = document.createElement("div");
    render(h(Cover, null, "centered"), root);
    expect(root.querySelector(".ps-cover")).not.toBeNull();
  });

  test("Frame renders with ratio CSS var", () => {
    const root = document.createElement("div");
    render(h(Frame, { ratio: "4 / 3" }, "media"), root);
    const el = root.querySelector(".ps-frame") as HTMLElement | null;
    expect(el?.style.getPropertyValue("--ps-frame-ratio")).toBe("4 / 3");
  });

  test("Reel renders with ps-reel class", () => {
    const root = document.createElement("div");
    render(h(Reel, { gap: "2" }, "scroll"), root);
    const el = root.querySelector(".ps-reel") as HTMLElement | null;
    expect(el?.style.getPropertyValue("--ps-gap")).toBe("var(--ps-space-2)");
  });

  test("Imposter renders with position var", () => {
    const root = document.createElement("div");
    render(h(Imposter, { position: "start" }, "overlay"), root);
    const el = root.querySelector(".ps-imposter") as HTMLElement | null;
    expect(el?.style.getPropertyValue("--ps-imposter-position")).toBe(
      "flex-start",
    );
  });

  test("Switcher sets data-limit attribute", () => {
    const root = document.createElement("div");
    render(h(Switcher, { limit: 4 }, "items"), root);
    expect(root.querySelector(".ps-switcher")?.getAttribute("data-limit")).toBe(
      "4",
    );
  });
});
