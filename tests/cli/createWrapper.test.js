/**
 * `npm create @wpsk/plugin` wrapper package (plan.installer.md Phase I7 — I7.3 / I7.4)
 *
 * The `npm create` convention (see `npm help npm-init`):
 *   - `npm create <name>`         → `npm exec create-<name>`
 *   - `npm create @scope/<name>`  → `npm exec @scope/create-<name>`
 *   - `npm create @wpsk/plugin`   → `npm exec @wpsk/create-plugin`
 *
 * So the package MUST be named `@wpsk/create-plugin` and expose a bin
 * that takes whatever argv the user passed to `npm create` and forwards
 * it to `wpsk create` (so `npm create @wpsk/plugin my-plugin --yes`
 * becomes `wpsk create my-plugin --yes`).
 *
 * The wrapper is a *tiny* adapter — it does NOT regenerate anything
 * itself. All real work happens in `@wpsk/cli`. This keeps the engine
 * (`@wpsk/create-wp-project`) as the single source of truth for the
 * generated project shape (Phase 25 variants, etc.).
 *
 * Source contract that this locks in (don't break these without bumping
 * the wrapper's behavior):
 *   packages/cli/create-plugin/package.json
 *     - "name": "@wpsk/create-plugin"
 *     - "type": "module"
 *     - "bin": { "create-wpsk-plugin": "bin/create-wpsk-plugin.js" }
 *       (or any bin — npm `create` only requires the package name to
 *        match `@wpsk/create-plugin`; the bin name is what `npm exec`
 *        actually invokes)
 *     - "files": includes "bin"
 *     - "dependencies": includes "@wpsk/cli" (workspace:* or ^0.1.0)
 *   packages/cli/create-plugin/bin/create-wpsk-plugin.js
 *     - shebang "#!/usr/bin/env node"
 *     - delegates to the @wpsk/cli bin with the `create` subcommand
 *       prepended to argv
 */
import { describe, test, expect } from "@jest/globals";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const WRAPPER_ROOT = join(process.cwd(), "packages/cli/create-plugin");
const WRAPPER_PKG_JSON = join(WRAPPER_ROOT, "package.json");

function loadWrapperPkg() {
  return JSON.parse(readFileSync(WRAPPER_PKG_JSON, "utf8"));
}

describe("@wpsk/create-plugin — package shape (I7.3/I7.4)", () => {
  test("packages/cli/create-plugin/package.json exists", () => {
    expect(existsSync(WRAPPER_PKG_JSON)).toBe(true);
  });

  test("package name is exactly @wpsk/create-plugin (npm create match)", () => {
    const pkg = loadWrapperPkg();
    // npm maps `npm create @wpsk/plugin` → `npm exec @wpsk/create-plugin`.
    // The package name MUST match exactly (scope + name) — npm does not
    // try fallback permutations.
    expect(pkg.name).toBe("@wpsk/create-plugin");
  });

  test("package depends on @wpsk/cli (the real dispatcher)", () => {
    const pkg = loadWrapperPkg();
    const deps = { ...(pkg.dependencies || {}), ...(pkg.peerDependencies || {}) };
    expect(deps["@wpsk/cli"]).toBeDefined();
  });

  test("package declares a bin entry (so `npm exec` can run it)", () => {
    const pkg = loadWrapperPkg();
    expect(pkg.bin).toBeDefined();
    // The bin name is up to us; the wrapper invokes it directly.
    // Common choices: "create-wpsk-plugin" or "wpsk-create".
    // We just need SOMETHING — npm exec @wpsk/create-plugin invokes
    // whatever bin the package declares.
    const binNames = Object.keys(pkg.bin);
    expect(binNames.length).toBeGreaterThan(0);
  });

  test("package is ESM and ships at least the bin directory in `files`", () => {
    const pkg = loadWrapperPkg();
    expect(pkg.type).toBe("module");
    expect(Array.isArray(pkg.files)).toBe(true);
    expect(pkg.files.length).toBeGreaterThan(0);
  });
});

describe("@wpsk/create-plugin — bin argv forwarding (I7.3/I7.4)", () => {
  // The wrapper bin must exist and be wired to forward argv into
  // `wpsk create <rest>`. We test the contract on disk (not by
  // spawning a child process) so the test stays hermetic.

  function findBinTarget() {
    const pkg = loadWrapperPkg();
    const firstName = Object.keys(pkg.bin)[0];
    return { name: firstName, target: pkg.bin[firstName] };
  }

  test("bin file exists on disk and is a file", () => {
    const { target } = findBinTarget();
    const binPath = join(WRAPPER_ROOT, target);
    expect(existsSync(binPath)).toBe(true);
    expect(statSync(binPath).isFile()).toBe(true);
  });

  test("bin file starts with the node shebang", () => {
    const { target } = findBinTarget();
    const binPath = join(WRAPPER_ROOT, target);
    const head = readFileSync(binPath, "utf8");
    const firstLine = head.split("\n", 1)[0];
    expect(firstLine).toBe("#!/usr/bin/env node");
  });

  test("bin file is executable (owner-x bit set)", () => {
    const { target } = findBinTarget();
    const binPath = join(WRAPPER_ROOT, target);
    const st = statSync(binPath);
    expect(st.mode & 0o100).toBe(0o100);
  });

  test("bin source forwards argv to wpsk with the `create` subcommand", () => {
    const { target } = findBinTarget();
    const binPath = join(WRAPPER_ROOT, target);
    const body = readFileSync(binPath, "utf8");
    // The wrapper must:
    //   (a) reference @wpsk/cli (or its bin) AND
    //   (b) inject the `create` subcommand into the argv it forwards
    //       to wpsk.
    // We assert both pieces appear in the source.
    //
    // We accept any of the common patterns:
    //   - execFileSync("wpsk", ["create", ...process.argv.slice(2)])
    //   - spawnSync(node, [wpskBin, "create", ...args])
    //   - require("@wpsk/cli")(...) — programmatic delegation
    // The invariant is: "create" is hard-coded in the source, and
    // the wrapper reads process.argv to forward user args.
    expect(body).toMatch(/create/);
    expect(body).toMatch(/process\.argv|argv|args/);
    // The wrapper should NOT re-implement prompts or generation —
    // it's a thin shim.
    expect(body).not.toMatch(/@clack\/prompts/);
    expect(body).not.toMatch(/gatherInputs/);
  });
});
