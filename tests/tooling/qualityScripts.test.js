import { describe, test, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import path from "node:path";

const pkgPath = path.resolve(__dirname, "../../package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

describe("Phase 13 quality scripts contract (RED step)", () => {
  test("package.json has prepare script for husky install", () => {
    expect(pkg.scripts).toHaveProperty("prepare");
    expect(typeof pkg.scripts.prepare).toBe("string");
  });

  test("package.json has typecheck script", () => {
    expect(pkg.scripts).toHaveProperty("typecheck");
    expect(pkg.scripts.typecheck).toMatch(/tsc --noEmit/);
  });

  test("package.json has lint:js and format:check scripts", () => {
    expect(pkg.scripts).toHaveProperty("lint:js");
    expect(pkg.scripts).toHaveProperty("format:check");
  });

  test("package.json has lint-staged config", () => {
    expect(pkg).toHaveProperty("lint-staged");
    expect(typeof pkg["lint-staged"]).toBe("object");
  });
});
