/**
 * js-review-core: dead-code removal locks.
 *
 * The js review (plan_18f9d2df) removed unused exports from
 * @wpdev/dependency-extraction-esbuild-plugin and @core/utils.
 * These tests lock the public surface so a future PR cannot
 * re-introduce the dead code without explicit intent.
 *
 *   - `generateInternalScriptHandles` was dead in the upstream
 *     webpack-gutenberg plugin (we forked it). The internal-libraries:
 *     namespace was never produced by our esbuild build, so the matcher
 *     was always empty and the function returned []. The contract we
 *     want to lock: this function is NOT part of our public API.
 *
 *   - `core/packages/utils/index.js` used to re-export `readProjectConfig`
 *     twice: once via `export * from "./readProjectConfig.js"` and once
 *     via `export { readProjectConfig } from "./readProjectConfig.js"`.
 *     The latter was a leftover and was removed. The contract we lock:
 *     `readProjectConfig` is still re-exported (one way), and the index
 *     file does not contain the literal `export { readProjectConfig }`
 *     line (which would be the redundancy marker).
 *
 *   - `core/packages/utils/check-cli.js` was a dead CLI shim duplicated
 *     by `core/packages/build/wpdev-check-cli.js` (Phase 23.B6).
 *     The kit's own `package.json` `check` script now points at the
 *     new (better) CLI. Both halves of that move are locked.
 */
import { describe, test, expect } from "@jest/globals";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("@wpdev/dependency-extraction-esbuild-plugin — public surface", () => {
  test("generateInternalScriptHandles is not exported (dead code removed)", async () => {
    const mod = await import("@wpdev/dependency-extraction-esbuild-plugin");
    expect(typeof mod.generateInternalScriptHandles).toBe("undefined");
  });

  test("the source file does not define generateInternalScriptHandles", () => {
    // Belt-and-suspenders: even if a future PR re-exports the symbol from
    // a re-exported utils.js, the dead definition must not come back.
    const src = readFileSync(
      join(
        process.cwd(),
        "core/packages/dependency-extraction-esbuild-plugin/index.js",
      ),
      "utf8",
    );
    expect(src).not.toMatch(/generateInternalScriptHandles/);
  });

  test("assetFileInfo no longer writes `dependencies: handles ?? []` (dead fallback)", () => {
    // The function builds `handles` from `generatedHandles.concat(forceAssets)`.
    // Both arms are always arrays, so the `?? []` fallback was dead code.
    // Lock the source so a future refactor doesn't re-introduce it.
    const src = readFileSync(
      join(
        process.cwd(),
        "core/packages/dependency-extraction-esbuild-plugin/index.js",
      ),
      "utf8",
    );
    expect(src).not.toMatch(/dependencies:\s*handles\s*\?\?\s*\[\s*\]/);
  });
});

describe("@core/utils/index.js — re-export discipline", () => {
  test("readProjectConfig is still exported (the export * path keeps it)", async () => {
    const { readProjectConfig } = await import("@core/utils");
    expect(typeof readProjectConfig).toBe("function");
  });

  test("the redundant `export { readProjectConfig }` line is gone", () => {
    const src = readFileSync(
      join(process.cwd(), "core/packages/utils/index.js"),
      "utf8",
    );
    // The line that was removed looked exactly like:
    //   export { readProjectConfig } from "./readProjectConfig.js";
    // The remaining `export * from "./readProjectConfig.js";` is fine.
    expect(src).not.toMatch(
      /export\s*\{\s*readProjectConfig\s*\}\s*from\s*["']\.\/readProjectConfig\.js["']\s*;?/,
    );
  });
});

describe("@core/utils/check-cli.js — dead file removal", () => {
  // js-review-core: `core/packages/utils/check-cli.js` was a thin CLI
  // shim for `checkProject()`. The same intent is now served by
  // `core/packages/build/wpdev-check-cli.js` (Phase 23.B6), which adds
  // structured error handling and uses the same `checkProject` library.
  // The package.json `check` script was repointed accordingly. These
  // tests lock both halves of that move so the dead file cannot
  // silently reappear (it would either re-introduce the duplicate CLI
  // surface or break `npm run check`).
  test("core/packages/utils/check-cli.js does not exist", () => {
    const deadPath = join(
      process.cwd(),
      "core/packages/utils/check-cli.js",
    );
    expect(existsSync(deadPath)).toBe(false);
  });

  test("root package.json `check` script targets wpdev-check-cli.js (not the dead file)", () => {
    const pkgPath = join(process.cwd(), "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    expect(pkg.scripts.check).toBeDefined();
    // The new script points at the better CLI in @wpdev/build. The old
    // target `core/packages/utils/check-cli.js` is gone.
    expect(pkg.scripts.check).toMatch(/wpdev-check-cli\.js/);
    expect(pkg.scripts.check).not.toMatch(/utils\/check-cli\.js/);
  });
});
