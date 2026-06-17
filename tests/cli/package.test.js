import { describe, test, expect } from "@jest/globals";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

describe("@wpdev/cli package contract", () => {
  const pkgPath = join(process.cwd(), "packages/cli/package.json");

  test("package.json exists at packages/cli/package.json", () => {
    expect(existsSync(pkgPath)).toBe(true);
  });

  test("package name is @wpdev/cli with version 0.1.0", () => {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    expect(pkg.name).toBe("@wpdev/cli");
    expect(pkg.version).toBe("0.1.0");
  });

  test("package is ESM with engines.node >= 18", () => {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    expect(pkg.type).toBe("module");
    expect(pkg.engines).toBeDefined();
    expect(pkg.engines.node).toMatch(/>=\s*18/);
  });

  test("bin.wpdev points at bin/wpdev.js", () => {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    expect(pkg.bin).toBeDefined();
    expect(pkg.bin.wpdev).toBe("bin/wpdev.js");
  });

  test("files whitelist includes bin and src", () => {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    expect(Array.isArray(pkg.files)).toBe(true);
    expect(pkg.files).toContain("bin");
    expect(pkg.files).toContain("src");
  });

  test("declares required runtime dependencies", () => {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    const deps = pkg.dependencies || {};
    expect(deps["@clack/prompts"]).toBeDefined();
    expect(deps.commander).toBeDefined();
    expect(deps.execa).toBeDefined();
    expect(deps.picocolors).toBeDefined();
    expect(deps["@wpdev/create-wp-project"]).toBeDefined();
  });
});

describe("@wpdev/cli bin entry", () => {
  const binPath = join(process.cwd(), "packages/cli/bin/wpdev.js");

  test("bin/wpdev.js exists", () => {
    expect(existsSync(binPath)).toBe(true);
  });

  test("bin/wpdev.js starts with the node shebang", () => {
    const head = readFileSync(binPath, "utf8");
    expect(head.startsWith("#!/usr/bin/env node")).toBe(true);
  });
});
