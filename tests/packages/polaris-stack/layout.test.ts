import { describe, test, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "packages/polaris-stack/src/layout");
const LAYOUT_CSS = readFileSync(join(ROOT, "layout.css"), "utf8");
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

describe("polaris-stack layout.css", () => {
  test("defines layout primitive classes", () => {
    expect(LAYOUT_CSS).toContain(".ps-stack");
    expect(LAYOUT_CSS).toContain(".ps-cluster");
    expect(LAYOUT_CSS).toContain(".ps-grid");
  });

  test("does not set visual styling properties", () => {
    for (const rule of FORBIDDEN) {
      expect(LAYOUT_CSS).not.toContain(rule);
    }
  });

  test("Box sets spacing via CSS custom properties only", () => {
    expect(BOX_TSX).toContain('"--ps-p"');
    expect(BOX_TSX).toContain('"--ps-px"');
    expect(BOX_TSX).not.toMatch(/s\.padding\b/);
    expect(LAYOUT_CSS).toContain("padding: var(--ps-p)");
    expect(LAYOUT_CSS).toContain("padding-inline-start: var(--ps-pl)");
  });

  test("Switcher limit uses nth-child overflow rules", () => {
    expect(LAYOUT_CSS).toContain(
      '.ps-switcher[data-limit="4"] > :nth-child(n + 5)',
    );
    expect(LAYOUT_CSS).not.toContain("flex-grow: 0");
  });
});
