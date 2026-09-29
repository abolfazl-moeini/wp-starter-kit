/** @jest-environment node */
import { describe, test, expect, beforeAll } from "@jest/globals";
import { readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = join(process.cwd(), "packages/polaris-stack");
const STYLES_CSS = join(ROOT, "dist", "styles.css");
const STYLES_MAP = join(ROOT, "dist", "styles.css.map");

// Regenerate only styles.css (no rm -rf of dist) so this test never races
// with the suites that require dist/index.js.
beforeAll(() => {
  const scriptPath = join(ROOT, "scripts", ".build-styles.test.tmp.mjs");
  writeFileSync(
    scriptPath,
    [
      `import { buildStylesCss } from ${JSON.stringify(join(ROOT, "scripts/build-css.mjs"))};`,
      `await buildStylesCss(${JSON.stringify(join(ROOT, "dist"))}, {`,
      `  minify: true,`,
      `  version: "9.9.9-test",`,
      `});`,
    ].join("\n"),
    "utf8",
  );
  try {
    execSync(`node ${JSON.stringify(scriptPath)}`, {
      cwd: ROOT,
      stdio: "pipe",
    });
  } finally {
    rmSync(scriptPath, { force: true });
  }
});

describe("polaris-stack styles.css build contract", () => {
  test("minified output is license-headered and build-stamped", () => {
    const css = readFileSync(STYLES_CSS, "utf8");
    // Header contract: version + git sha + ISO build timestamp, then license.
    expect(css.startsWith("/*! @wpdev/polaris-stack v9.9.9-test+")).toBe(true);
    expect(css).toMatch(
      /^\/\*! @wpdev\/polaris-stack v9\.9\.9-test\+[0-9a-f]+ @ \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[^|]* | MIT \| /,
    );
    expect(css).toContain(".ps-button{");
  });

  test("minified build ships a sourcemap annotation", () => {
    const css = readFileSync(STYLES_CSS, "utf8");
    expect(css).toContain("/*# sourceMappingURL=styles.css.map */");
    expect(existsSync(STYLES_MAP)).toBe(true);
  });

  test("sourcemap references the real src/**/*.css files", () => {
    const map = JSON.parse(readFileSync(STYLES_MAP, "utf8"));
    expect(map.version).toBe(3);
    expect(map.sources.length).toBeGreaterThan(0);
    for (const source of map.sources) {
      const resolved = join(ROOT, "dist", source);
      expect(existsSync(resolved)).toBe(true);
      expect(resolved).toMatch(/src[\\/].+\.css$/);
    }
    // Mappings must be non-empty — a map without mappings is useless.
    expect(map.mappings.length).toBeGreaterThan(10);
  });

  test("no temporary build artifacts are left behind", () => {
    expect(existsSync(join(ROOT, ".styles-entry.tmp.css"))).toBe(false);
    expect(existsSync(join(ROOT, "dist", ".styles-bundle.tmp.css"))).toBe(
      false,
    );
    expect(existsSync(join(ROOT, "dist", ".styles-bundle.tmp.css.map"))).toBe(
      false,
    );
  });
});
