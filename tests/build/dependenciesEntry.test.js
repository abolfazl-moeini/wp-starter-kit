/** @jest-environment jsdom */
import { describe, test, expect } from "@jest/globals";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const DEPS_ENTRY_TS = join(process.cwd(), "assets/dependencies.ts");
const DEPS_ENTRY_JS = join(process.cwd(), "assets/dependencies.js");
const ESBUILD_CONFIG = join(
  process.cwd(),
  "core/packages/build/esbuild-dependencies.js",
);

describe("assets/dependencies — TS entry point contract (p12 rename)", () => {
  test("assets/dependencies.ts exists (canonical TS entry)", () => {
    expect(existsSync(DEPS_ENTRY_TS)).toBe(true);
  });

  test("assets/dependencies.ts is a real file (not a symlink or dir)", () => {
    const stat = statSync(DEPS_ENTRY_TS);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBeGreaterThan(0);
  });

  test("assets/dependencies.js is NOT present (the .js entry is gone)", () => {
    // The rename moves the canonical source to .ts. A stale .js must not
    // shadow the .ts entry; the build must read from .ts.
    expect(existsSync(DEPS_ENTRY_JS)).toBe(false);
  });

  test("dependencies.ts is a JS-compatible module (export/import syntax)", () => {
    const source = readFileSync(DEPS_ENTRY_TS, "utf8");
    // TS module must have at least one `export` declaration
    expect(source).toMatch(/^export\s+/m);
    // TS module must have at least one top-level `import` statement
    expect(source).toMatch(/^import\s+/m);
    // It must NOT have stripped JS — we are renaming only, not refactoring.
    // Assert the same createHooks() singleton pattern is preserved.
    expect(source).toMatch(/createHooks\s*\(/);
  });

  test("dependencies.ts preserves the createHooks singleton + table alias", () => {
    // The 1.6 tabulator pattern: dependencies.ts (renamed from .js) still
    // bridges window.Tabulator into the IIFE global.
    const source = readFileSync(DEPS_ENTRY_TS, "utf8");
    expect(source).toMatch(/export\s+const\s+hooks\s*=/);
    expect(source).toMatch(/export\s+const\s+table\s*=/);
    expect(source).toContain("window.Tabulator");
  });

  test("dependencies.ts preserves the ajax-start/domReady action registration", () => {
    const source = readFileSync(DEPS_ENTRY_TS, "utf8");
    // build-time placeholder for the prefix is still in the source — the
    // esbuild define pipeline replaces it at bundle time.
    const hasLiteral = source.includes("<hookPrefix>-request-ajax-start");
    const hasInterpolated = /\$\{[^}]*\}[\s-]*request-ajax-start/.test(source);
    expect(hasLiteral || hasInterpolated).toBe(true);
    expect(source).toMatch(/hooks\.addAction/);
  });
});

describe("esbuild-dependencies config — TS entry point wiring", () => {
  // We don't import the SUT here — we read the source of the esbuild config
  // and assert the loader and entry-point contract. This locks the wiring
  // without coupling to esbuild internals.

  test("esbuild-dependencies.js loader covers .ts", () => {
    const source = readFileSync(ESBUILD_CONFIG, "utf8");
    // The loader map must contain '.ts' → 'ts' so esbuild parses the
    // renamed entry as TypeScript.
    expect(source).toMatch(/['"]\.ts['"]\s*:\s*['"]ts['"]/);
    // The loader must also still cover .js (components may use .js until
    // phase 18) — but a stricter check is acceptable.
    expect(source).toMatch(/['"]\.js['"]\s*:\s*['"]jsx['"]/);
  });

  test("esbuild-dependencies.js default entryPoint is assets/dependencies.ts", () => {
    const source = readFileSync(ESBUILD_CONFIG, "utf8");
    // The default (when no entryPoint override is supplied) must point at .ts
    // now that the file has been renamed. We assert the literal appears in
    // the source as a default fallback.
    expect(source).toMatch(/['"]assets\/dependencies\.ts['"]/);
    // The previous default ('assets/dependencies.js') MUST be gone in code
    // (only allowed in comments) — otherwise the build would still try to
    // read a file that no longer exists.
    const codeOnly = source
      .replace(/\/\*[\s\S]*?\*\//g, "") // strip block comments
      .replace(/^\s*\/\/.*$/gm, ""); // strip line comments
    expect(codeOnly).not.toMatch(/['"]assets\/dependencies\.js['"]/);
  });
});

describe("assets/dependencies — backwards compat alias", () => {
  // Soft-assert: the .ts file is canonical. The .js file should not exist
  // but if a future phase reintroduces a stub .js wrapper, we don't want
  // the build to silently start reading from the wrapper. The hard check
  // above (existsSync === false) is the gate; this is a documentation
  // describe block to keep the rationale next to the hard check.

  test("soft-assert: .ts is the canonical extension", () => {
    const tsExists = existsSync(DEPS_ENTRY_TS);
    const jsExists = existsSync(DEPS_ENTRY_JS);
    // If both exist, that's a build bug. Hard fail.
    expect(tsExists).toBe(true);
    expect(jsExists).toBe(false);
  });
});
