import { describe, test, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const LAYOUT_CSS = readFileSync(
  join(process.cwd(), "packages/polaris-stack/src/layout/layout.css"),
  "utf8",
);

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
});
