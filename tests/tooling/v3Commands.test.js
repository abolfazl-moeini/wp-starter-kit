/**
 * Phase 27.5 — v3 engine CLI wrappers.
 */

import { describe, test, expect } from "@jest/globals";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const wrappers = [
  "packages/create-wp-project/src/scaffold-cli.js",
  "packages/create-wp-project/src/add-feature-cli.js",
  "packages/create-wp-project/src/update-cli.js",
  "packages/create-wp-project/src/doctor-cli.js",
];

describe("v3 command contract (Phase 27.5)", () => {
  test("CLI wrapper scripts exist", () => {
    wrappers.forEach((rel) => {
      expect(existsSync(join(root, rel))).toBe(true);
    });
  });

  test("package.json exposes scaffold, add-feature, update, doctor scripts", () => {
    expect(pkg.scripts).toHaveProperty("scaffold");
    expect(pkg.scripts).toHaveProperty("add-feature");
    expect(pkg.scripts).toHaveProperty("update");
    expect(pkg.scripts).toHaveProperty("doctor");
  });
});
