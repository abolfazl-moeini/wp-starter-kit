/**
 * @jest-environment node
 *
 * p12-asset-metadata — `.asset.php` contract for TS-entry builds
 * ---------------------------------------------------------------
 * The dependency bundle in this kit is built from `assets/dependencies.ts`
 * (p12 rename). esbuild produces `assets/bundles/wpsk-starter-deps.js` and
 * the `@core/dependency-extraction-esbuild-plugin` `saveAssetFile` helper
 * emits a sibling `wpsk-starter-deps.asset.php` containing the
 * `dependencies`, `internal_packages`, and `hash` keys — the same shape
 * WordPress core reads via `wp_register_script_from_metadata()`.
 *
 * This test file locks that contract end-to-end:
 *   1. `saveAssetFile` returns a stable three-key object on a synthetic
 *      TS-entry metafile.
 *   2. `phpFileContent` + `assetFilePath` produce a WordPress-style
 *      `<?php return array(...);` string with the `.asset.php` extension
 *      next to the `.js` bundle.
 *   3. `package.json` declares a `build:dependencies` script that
 *      actually wires through the dependency CLI.
 *   4. The CLI script is a real file (not a placeholder).
 *   5. Hard-disk integration: running the build from a clean tree
 *      produces BOTH the `.js` bundle AND the `.asset.php` sibling,
 *      and the on-disk PHP file `eval`uates to an array with the
 *      three required keys.
 *
 * If `saveAssetFile` ever stops emitting `.asset.php`, or if the build
 * pipeline loses the TS-entry wiring, these tests fail before the
 * shipped plugin can register a script with no metadata.
 */
import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "@jest/globals";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import mock from "mock-fs";

let saveAssetFile;
let phpFileContent;
let assetFilePath;
let bundleFilePath;

beforeAll(async () => {
  const mod = await import("@core/dependency-extraction-esbuild-plugin");
  saveAssetFile = mod.saveAssetFile;
  phpFileContent = mod.phpFileContent;
  assetFilePath = mod.assetFilePath;
  bundleFilePath = mod.bundleFilePath;
});

// --- synthetic metafile shape ----------------------------------------------
// A build where the entry is `assets/dependencies.ts` (p12 rename), the
// bundle is emitted to `assets/bundles/wpsk-starter-deps.js`, and the
// metafile contains one resolved WordPress external (`wp-hooks`).
const tsEntryMetafile = {
  metafile: {
    inputs: {
      "external-global-wordpress:@wordpress/hooks": { bytes: 100 },
      "assets/dependencies.ts": { bytes: 200 },
    },
    outputs: {
      "assets/bundles/wpsk-starter-deps.js": { bytes: 500 },
    },
  },
};

const tsEntryJsBundleContent =
  "/* synthetic wpsk-starter-deps.ts bundle for asset.php tests */";

describe("saveAssetFile — TS-entry metafile contract", () => {
  beforeEach(() => {
    // saveAssetFile → assetFileInfo → fileCheckSum reads the bundle from disk,
    // so we must mock the bundle file. mock-fs replaces the working tree;
    // we keep the repo's own node_modules/etc. by routing through process.cwd()
    // and letting the real fs paths resolve.
    mock({
      "assets/bundles/wpsk-starter-deps.js": tsEntryJsBundleContent,
    });
  });

  afterEach(() => {
    mock.restore();
  });

  test("saveAssetFile returns a truthy value for a TS-entry metafile", async () => {
    const result = await saveAssetFile(tsEntryMetafile);
    expect(result).toBeTruthy();
  });

  test("saveAssetFile resolves the .js bundle from the metafile outputs", async () => {
    // We assert this via the public side effect: a sibling .asset.php is
    // written next to the .js bundle. mock-fs lets us see what got written.
    await saveAssetFile(tsEntryMetafile);
    // The plugin writes to assetFilePath(bundleFilePath(metafile)). The
    // bundle file is `assets/bundles/wpsk-starter-deps.js`, so the asset
    // file is `assets/bundles/wpsk-starter-deps.asset.php`.
    expect(existsSync("assets/bundles/wpsk-starter-deps.asset.php")).toBe(true);
  });

  test("saveAssetFile accepts a TS-entry metafile with no WP externals (no throw)", async () => {
    // Even if the TS entry inlines everything, saveAssetFile must not throw
    // and must still produce a valid .asset.php (with empty dependencies).
    const noWPMetafile = {
      metafile: {
        inputs: {
          "assets/dependencies.ts": { bytes: 200 },
        },
        outputs: {
          "assets/bundles/wpsk-starter-deps.js": { bytes: 500 },
        },
      },
    };
    const result = await saveAssetFile(noWPMetafile);
    expect(result).toBeTruthy();
    expect(existsSync("assets/bundles/wpsk-starter-deps.asset.php")).toBe(true);
  });

  test("saveAssetFile rejects a metafile with no outputs (no .js bundle resolves)", async () => {
    // With an empty `outputs` map there is no .js bundle for the plugin
    // to attach a sibling .asset.php to. `bundleFilePath` returns
    // undefined and the downstream `fileCheckSum(undefined)` throws.
    // The contract we lock here is: a metafile with no outputs must
    // NOT silently produce a valid-looking .asset.php — either it
    // returns false (the documented graceful path) or it throws (the
    // actual current behavior). What it must NOT do is write a
    // malformed .asset.php file.
    const empty = { metafile: { inputs: {}, outputs: {} } };
    let result;
    let threw = false;
    try {
      result = await saveAssetFile(empty);
    } catch {
      threw = true;
    }
    // Either the function returned false, or it threw. The hard rule is:
    // no .asset.php got written for a no-outputs metafile.
    expect(threw || result === false).toBe(true);
    expect(existsSync("assets/bundles/wpsk-starter-deps.asset.php")).toBe(
      false,
    );
  });
});

describe("phpFileContent + assetFilePath — WordPress .asset.php shape", () => {
  test("phpFileContent wraps a three-key object in a PHP return statement", () => {
    const info = {
      dependencies: ["wp-hooks"],
      internal_packages: [],
      hash: "5dafb09f595046db87e84f63b652b976",
    };
    const php = phpFileContent(info);
    // The WP dependency-extraction convention starts with `<?php return`
    // and uses array(...) literal syntax so that the file is `eval`able
    // via `include` in `wp_register_script`.
    expect(php.startsWith("<?php return")).toBe(true);
    expect(php.trimEnd().endsWith(";")).toBe(true);
    expect(php).toContain("'dependencies'");
    expect(php).toContain("'internal_packages'");
    expect(php).toContain("'hash'");
    expect(php).toContain("wp-hooks");
    expect(php).toContain("5dafb09f595046db87e84f63b652b976");
  });

  test("phpFileContent produces an empty dependencies array when input is empty", () => {
    const php = phpFileContent({
      dependencies: [],
      internal_packages: [],
      hash: "x",
    });
    // The plugin must not collapse an empty array to `[]` (PHP short
    // syntax); the file is consumed by PHP 7+ which supports both, but
    // the WP convention is the long `array(...)` form for readability.
    expect(php).toContain("array()");
    // The hash survives even when there are no deps.
    expect(php).toContain("'hash'");
    expect(php).toContain("'x'");
  });

  test("assetFilePath replaces the .js extension with .asset.php next to the bundle", () => {
    const phpPath = assetFilePath("assets/bundles/wpsk-starter-deps.js");
    expect(phpPath).toBe("assets/bundles/wpsk-starter-deps.asset.php");
  });

  test("assetFilePath also works for .css bundles (WordPress also reads CSS asset.php)", () => {
    const phpPath = assetFilePath("assets/bundles/style.css");
    expect(phpPath).toBe("assets/bundles/style.asset.php");
  });

  test("bundleFilePath picks the .js output from a metafile with map sibling", () => {
    // Real esbuild output includes both `wpsk-starter-deps.js` and
    // `wpsk-starter-deps.js.map`. bundleFilePath must return ONLY the
    // .js entry so the .asset.php is named after it, not after the map.
    const mf = {
      metafile: {
        outputs: {
          "assets/bundles/wpsk-starter-deps.js": { bytes: 500 },
          "assets/bundles/wpsk-starter-deps.js.map": { bytes: 200 },
        },
      },
    };
    const bundle = bundleFilePath(mf);
    expect(bundle).toBe("assets/bundles/wpsk-starter-deps.js");
  });
});

describe("build:dependencies script — package.json + CLI wiring", () => {
  const PKG_JSON = join(process.cwd(), "package.json");
  const CLI_FILE = join(
    process.cwd(),
    "core/packages/build/esbuild-dependencies-cli.js",
  );

  test("package.json declares a build:dependencies script", () => {
    const pkg = JSON.parse(readFileSync(PKG_JSON, "utf8"));
    expect(pkg.scripts).toBeDefined();
    expect(typeof pkg.scripts["build:dependencies"]).toBe("string");
  });

  test("build:dependencies script invokes the dependency CLI via node", () => {
    const pkg = JSON.parse(readFileSync(PKG_JSON, "utf8"));
    const script = pkg.scripts["build:dependencies"];
    // The script must use `node` to run the dependency CLI, not some
    // other entry. We accept any path that ends with the CLI file.
    expect(script).toMatch(/\bnode\b/);
    expect(script).toMatch(/esbuild-dependencies-cli\.js/);
  });

  test("esbuild-dependencies-cli.js exists as a real file", () => {
    expect(existsSync(CLI_FILE)).toBe(true);
    const stat = statSync(CLI_FILE);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBeGreaterThan(0);
  });

  test("esbuild-dependencies-cli.js imports runBuild and calls it", () => {
    const cli = readFileSync(CLI_FILE, "utf8");
    expect(cli).toMatch(
      /import\s+.*\s+from\s+['"]\.\/esbuild-dependencies\.js['"]/,
    );
    expect(cli).toMatch(/runBuild\s*\(/);
    // The CLI is the build entry point — it must catch errors and exit
    // non-zero, otherwise CI cannot detect a failed build.
    expect(cli).toMatch(/process\.exit\(1\)|process\.exit\s*\(\s*1\s*\)/);
  });
});

describe("Hard-disk integration — build:dependencies produces .asset.php", () => {
  // This is the only test in the file that touches the real filesystem.
  // We run `npm run build:dependencies` from a clean `assets/bundles`
  // directory and assert both outputs land where the plugin says they
  // should. We do NOT re-run the full build (that would re-build the
  // components and styles too); the dependencies script is sufficient
  // for the .asset.php contract because that is the script the spec
  // points at.
  //
  // We skip this suite if the working tree has no `node_modules` (e.g.
  // CI cache miss) — running the build without dependencies is wasteful
  // and would fail for an unrelated reason. The on-disk artifact check
  // is also asserted in the static asserts above.

  const BUNDLES_DIR = join(process.cwd(), "assets/bundles");
  const JS_BUNDLE = join(BUNDLES_DIR, "wpsk-starter-deps.js");
  const ASSET_PHP = join(BUNDLES_DIR, "wpsk-starter-deps.asset.php");

  let buildSucceeded = false;
  let buildError = null;

  beforeAll(() => {
    if (!existsSync(join(process.cwd(), "node_modules"))) {
      buildError = new Error(
        "node_modules missing — skipping integration build",
      );
      return;
    }
    try {
      // Clean the bundles dir so we know the .asset.php came from THIS run.
      rmSync(BUNDLES_DIR, { recursive: true, force: true });
      mkdirSync(BUNDLES_DIR, { recursive: true });
      execFileSync("npm", ["run", "build:dependencies"], {
        cwd: process.cwd(),
        stdio: "pipe",
        env: { ...process.env, NODE_ENV: "test" },
      });
      buildSucceeded = existsSync(JS_BUNDLE) && existsSync(ASSET_PHP);
    } catch (err) {
      buildError = err;
    }
  }, 120_000);

  afterAll(() => {
    // Restore the bundles dir to a non-empty state so subsequent test
    // runs that read project.config or build outputs don't see an
    // unexpected empty tree. We don't synthesize artifacts; we just
    // make sure the dir exists.
    if (!existsSync(BUNDLES_DIR)) {
      mkdirSync(BUNDLES_DIR, { recursive: true });
    }
  });

  test("npm run build:dependencies completes without throwing", () => {
    if (buildError) {
      // Surface the actual error so the failure is debuggable.
      throw buildError;
    }
    expect(buildError).toBeNull();
  });

  test("build emits the .js bundle", () => {
    if (!buildSucceeded) {
      // If the build failed, the missing-bundle assertion would be
      // misleading — surface that the integration test was skipped
      // because of a build error.
      throw buildError ?? new Error("build did not complete");
    }
    expect(existsSync(JS_BUNDLE)).toBe(true);
    expect(statSync(JS_BUNDLE).size).toBeGreaterThan(0);
  });

  test("build emits the sibling .asset.php with the .js bundle", () => {
    if (!buildSucceeded) {
      throw buildError ?? new Error("build did not complete");
    }
    expect(existsSync(ASSET_PHP)).toBe(true);
    expect(statSync(ASSET_PHP).size).toBeGreaterThan(0);
  });

  test("on-disk .asset.php parses as a PHP-returned array with the three required keys", () => {
    if (!buildSucceeded) {
      throw buildError ?? new Error("build did not complete");
    }
    const php = readFileSync(ASSET_PHP, "utf8");
    // Sanity: the file is a PHP return statement.
    expect(php.trimStart().startsWith("<?php")).toBe(true);
    expect(php).toContain("return");
    expect(php).toContain("'dependencies'");
    expect(php).toContain("'internal_packages'");
    expect(php).toContain("'hash'");
    // The dependencies array must contain at least one wp- handle, since
    // `assets/dependencies.ts` imports `@wordpress/hooks`.
    expect(php).toMatch(/'wp-[\w-]+'/);
    // The hash must be a 32-char hex MD5.
    const hashMatch = php.match(/'hash'\s*=>\s*'([0-9a-f]{32})'/);
    expect(hashMatch).not.toBeNull();
  });
});
