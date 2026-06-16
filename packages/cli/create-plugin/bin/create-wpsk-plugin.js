#!/usr/bin/env node
/**
 * @wpsk/create-plugin — wrapper bin for `npm create @wpsk/plugin`
 * (plan.installer.md Phase I7 — I7.4).
 *
 * This is a *tiny* shim. It does NOT regenerate anything itself.
 * Its only job is to take whatever argv the user passed to
 * `npm create @wpsk/plugin ...`, prepend the `create` subcommand,
 * and hand the result to the @wpsk/cli bin.
 *
 * Examples:
 *   npm create @wpsk/plugin my-plugin --yes
 *     → node packages/cli/bin/wpsk.js create my-plugin --yes
 *
 *   npm create @wpsk/plugin@0.1.0 my-plugin --scope=acme
 *     → node packages/cli/bin/wpsk.js create my-plugin --scope=acme
 *
 * The npm `create` convention (see `npm help npm-init`) maps:
 *   `npm create @wpsk/plugin`  →  `npm exec @wpsk/create-plugin`
 * so the package name must be exactly `@wpsk/create-plugin` and
 * the bin is what `npm exec` invokes — the bin name itself is
 * free-form (we use `create-wpsk-plugin` for symmetry with the
 * unscoped `create-*` convention).
 *
 * Why we resolve the @wpsk/cli bin by *file path* (not by `wpsk` on
 * PATH): when this shim runs from `npm exec @wpsk/create-plugin`,
 * the working directory is the user's project, not the kit
 * monorepo. PATH may not contain `wpsk`. The most reliable way to
 * find the real bin is to ask npm's resolution algorithm via
 * `import.meta.resolve("@wpsk/cli")`, then read its `package.json`
 * to look up `bin.wpsk`.
 *
 * Inside the kit monorepo (development), npm workspaces symlinks
 * `node_modules/@wpsk/cli` to `packages/cli`, so the resolved path
 * points at the real source — no separate install step required.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve as resolvePath } from "node:path";

// 1. Resolve the @wpsk/cli package directory. We start from THIS
//    file's location (…/packages/cli/create-plugin/bin/) and walk
//    up to find node_modules/@wpsk/cli. This is robust under:
//      - monorepo workspace: node_modules/@wpsk/cli (symlink) is
//        hoisted at the kit root, so we walk up two levels.
//      - downstream install: node_modules/@wpsk/cli is alongside
//        this package in the user's node_modules.
//      - npm exec: the wrapper is in some temp prefix, but the
//        @wpsk/cli package is in the same node_modules tree.
const here = dirname(fileURLToPath(import.meta.url));

function findCliPackageDir(start) {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, "node_modules", "@wpsk", "cli");
    try {
      // statSync via readFileSync below would throw if missing;
      // we use existsSync-equivalent by trying to read its package.json.
      readFileSync(join(candidate, "package.json"), "utf8");
      return candidate;
    } catch {
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return null;
}

const cliPkgDir = findCliPackageDir(here);

if (!cliPkgDir) {
  process.stderr.write(
    "@wpsk/create-plugin: could not locate @wpsk/cli. " +
      "Did you forget to install dependencies? (`npm install`)\n",
  );
  process.exit(2);
}

// 2. Read the @wpsk/cli package.json to find its `bin.wpsk` target.
const cliPkg = JSON.parse(
  readFileSync(join(cliPkgDir, "package.json"), "utf8"),
);
const cliBinRel = cliPkg.bin && cliPkg.bin.wpsk;
if (!cliBinRel) {
  process.stderr.write(
    "@wpsk/create-plugin: @wpsk/cli has no `bin.wpsk` entry. " +
      "This is a packaging bug; please report it.\n",
  );
  process.exit(2);
}
const cliBinAbs = resolvePath(cliPkgDir, cliBinRel);

// 3. Prepend the `create` subcommand to the user's argv and exec
//    node on the resolved @wpsk/cli bin. We use spawnSync with
//    stdio:"inherit" so prompts, output, and exit codes pass
//    through unchanged.
const userArgs = process.argv.slice(2);
const fullArgs = ["create", ...userArgs];

const result = spawnSync(process.execPath, [cliBinAbs, ...fullArgs], {
  stdio: "inherit",
});

// spawnSync returns null when the child failed to spawn; treat
// that as a fatal error rather than a silent success.
if (result.error) {
  process.stderr.write(
    "@wpsk/create-plugin: failed to exec @wpsk/cli: " +
      result.error.message +
      "\n",
  );
  process.exit(1);
}

// Use the child's exit code if it ran; otherwise 1.
process.exit(result.status == null ? 1 : result.status);
