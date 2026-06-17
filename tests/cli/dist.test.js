/**
 * @wpsk/cli distribution contract (plan.installer.md Phase I7 — I7.1 / I7.2)
 *
 * Asserts the bits that make the package *installable* by end users:
 *   - `bin.wpdev` maps to a real file that is a Node ESM entry (shebang).
 *   - The bin file is executable on disk (mode bit set).
 *   - `files` whitelist ships bin + src (NOT the test fixtures, scratch, or
 *     dev-only folders).
 *   - `engines.node` advertises a minimum runtime the bin actually requires.
 *   - The bin file resolves to ESM source so `node bin/wpdev.js` and
 *     `npx wpsk` both work.
 *
 * Source contract that this locks in (don't break these without bumping the
 * package's behavior):
 *   packages/cli/package.json
 *     - "name": "@wpsk/cli"
 *     - "type": "module"        (so the bin can `import "../src/main.js"`)
 *     - "bin.wpdev": "bin/wpdev.js"
 *     - "files": [ "bin", "src" ]
 *     - "engines.node": ">=18"
 *   packages/cli/bin/wpdev.js
 *     - First line: "#!/usr/bin/env node"
 *     - Body: `import "../src/main.js";` (delegates to the actual program)
 *
 * The companion unit-level shape lives in tests/cli/package.test.js; this
 * file owns the distribution/install concerns.
 */
import { describe, test, expect } from "@jest/globals";
import { readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const PKG_ROOT = join(process.cwd(), "packages/cli");
const PKG_JSON = join(PKG_ROOT, "package.json");
const BIN_FILE = join(PKG_ROOT, "bin", "wpdev.js");

function loadPkg() {
  return JSON.parse(readFileSync(PKG_JSON, "utf8"));
}

describe("@wpsk/cli distribution — bin executable contract", () => {
  test("package.json declares bin.wpdev → bin/wpdev.js", () => {
    const pkg = loadPkg();
    expect(pkg.bin).toBeDefined();
    expect(pkg.bin.wpdev).toBe("bin/wpdev.js");
  });

  test("bin/wpdev.js exists on disk and is a file", () => {
    expect(existsSync(BIN_FILE)).toBe(true);
    const st = statSync(BIN_FILE);
    expect(st.isFile()).toBe(true);
  });

  test("bin/wpdev.js starts with the node shebang", () => {
    const head = readFileSync(BIN_FILE, "utf8");
    // Exact-match the shebang line so we don't accept e.g. a comment above.
    const firstLine = head.split("\n", 1)[0];
    expect(firstLine).toBe("#!/usr/bin/env node");
  });

  test("bin/wpdev.js is executable on disk (mode includes owner-x bit)", () => {
    const st = statSync(BIN_FILE);
    // 0o100 = owner execute. We only require owner-x; group/other bits are
    // not part of this contract.
    expect(st.mode & 0o100).toBe(0o100);
  });

  test("bin/wpdev.js delegates to src/main.js (ESM import, not require)", () => {
    const body = readFileSync(BIN_FILE, "utf8");
    // Must be ESM (no CommonJS require of the entry).
    expect(body).toMatch(/^\s*import\s+["']\.\.\/src\/main\.js["']/m);
    expect(body).not.toMatch(/require\s*\(\s*["']\.\.\/src\/main\.js/);
  });
});

describe("@wpsk/cli distribution — files whitelist contract", () => {
  test("files whitelist is an array that includes bin and src", () => {
    const pkg = loadPkg();
    expect(Array.isArray(pkg.files)).toBe(true);
    expect(pkg.files).toContain("bin");
    expect(pkg.files).toContain("src");
  });

  test("files whitelist does NOT include test fixtures or scratch dirs", () => {
    const pkg = loadPkg();
    // Guard against accidentally shipping tests/scratch/dist into the tarball.
    const blocked = ["tests", "test", "__tests__", "scratch", "dist", ".idea"];
    for (const bad of blocked) {
      expect(pkg.files).not.toContain(bad);
    }
  });
});

describe("@wpsk/cli distribution — engines node contract", () => {
  test("engines.node advertises Node >= 18", () => {
    const pkg = loadPkg();
    expect(pkg.engines).toBeDefined();
    expect(pkg.engines.node).toMatch(/>=\s*18/);
  });

  test("package is ESM (required by the bin's import statement)", () => {
    const pkg = loadPkg();
    expect(pkg.type).toBe("module");
  });
});
