import { describe, test, expect } from "@jest/globals";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

describe("ExampleFeature build integration", () => {
  test("module TS entry exists for esbuild glob", () => {
    const entry = join(
      process.cwd(),
      "src/Modules/ExampleFeature/assets/entries/admin.ts",
    );
    expect(existsSync(entry)).toBe(true);
    const source = readFileSync(entry, "utf8");
    expect(source).toMatch(/domReady/);
  });

  test("esbuild-components discovers module entry glob", () => {
    const source = readFileSync(
      join(process.cwd(), "core/packages/build/esbuild-components.js"),
      "utf8",
    );
    expect(source).toContain("src/Modules/*/assets/entries/*.ts");
    expect(source).toMatch(/ExampleFeature-admin|moduleName.*entryName/);
  });
});
