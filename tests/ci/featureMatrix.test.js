/**
 * Phase 27.3 — CI feature matrix contract.
 */

import { describe, test, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ci = readFileSync(
  join(process.cwd(), ".github/workflows/ci.yml"),
  "utf8",
);

describe("CI feature matrix (Phase 27.3)", () => {
  test("ci.yml defines a scaffold-matrix job", () => {
    expect(ci).toMatch(/^\s{2}scaffold-matrix:\s*$/m);
  });

  test("scaffold-matrix exercises js:none, js:flow, and jsTest:vitest", () => {
    expect(ci).toMatch(/--js=none/);
    expect(ci).toMatch(/--js=flow/);
    expect(ci).toMatch(/--js-test=vitest/);
  });

  test("scaffold-matrix exercises faultTolerance:on with php 8.1", () => {
    expect(ci).toMatch(/--fault-tolerance=on/);
    expect(ci).toMatch(/--php-min=8\.1/);
  });
});
