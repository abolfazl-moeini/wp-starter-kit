import { describe, test, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const COMPONENTS_CSS = readFileSync(
  join(process.cwd(), "packages/polaris-stack/src/components/components.css"),
  "utf8",
);

describe("polaris-stack components.css", () => {
  test("uses design tokens via CSS variables", () => {
    expect(COMPONENTS_CSS).toContain("var(--ps-color-primary)");
    expect(COMPONENTS_CSS).toContain("var(--ps-color-fg)");
    expect(COMPONENTS_CSS).toContain("var(--ps-space-");
  });

  test("button includes focus-visible style", () => {
    expect(COMPONENTS_CSS).toContain(":focus-visible");
  });
});
