/**
 * @wpsk/cli — main entry. Wires the `commander` program with subcommands
 * (`create`, `add`, `remove`, `list`, `update`, `doctor`, `info`) and the
 * global `--version` / `--verbose` flags. The action bodies live in
 * `src/commands/*.js`; this module is the dispatcher.
 *
 * Exporting `buildProgram()` lets unit tests inspect the program tree
 * without spawning a child process.
 *
 * NOTE: This file must remain Jest-importable (babel-jest does not
 * transform `import.meta`). We therefore resolve the package's
 * `package.json` via `process.cwd()` + a relative path, matching the
 * convention used by `packages/create-wp-project/src/index.js`.
 */
import { Command } from "commander";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { runCreate } from "./commands/create.js";
import { runAdd } from "./commands/add.js";
import { runRemove } from "./commands/remove.js";
import { runList } from "./commands/list.js";
import { runUpdate } from "./commands/update.js";
import { runDoctor } from "./commands/doctor.js";
import { runInfo } from "./commands/info.js";

/**
 * Resolve the on-disk path of the package.json that declares our
 * version. Resolution order:
 *   1. `cwd()/packages/cli/package.json` (kit's local workspace)
 *   2. `cwd()/../package.json` (when invoked from inside the
 *      `packages/cli` directory itself — the `node packages/cli/bin/wpsk.js`
 *      recipe bumps cwd to the kit root, but jest or ad-hoc scripts
 *      sometimes don't)
 *   3. As a last resort, return whatever exists. The version reader
 *      is defensive about missing files.
 */
function resolvePackageJson() {
  const candidates = [
    join(process.cwd(), "packages/cli/package.json"),
    join(process.cwd(), "package.json"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0];
}

function readCliVersion() {
  try {
    const raw = readFileSync(resolvePackageJson(), "utf8");
    const pkg = JSON.parse(raw);
    if (pkg.name === "@wpsk/cli" && typeof pkg.version === "string") {
      return pkg.version;
    }
    // If we accidentally read the root package.json, fall through
    // to its own version (kit version) — better than "0.0.0".
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/**
 * Build a fully configured `commander` program. Pure function — no
 * `.parse()` is called, so tests can introspect the command tree.
 *
 * @returns {import('commander').Command}
 */
export function buildProgram() {
  const program = new Command();

  program
    .name("wpsk")
    .description(
      "Command-line installer for wp-starter-kit plugins. " +
        "Scaffolds new projects, adds/removes features, and updates " +
        "existing projects to a newer kit version.",
    )
    .version(readCliVersion(), "-V, --version", "print wpsk version and exit")
    .option("-v, --verbose", "log child-process output to the terminal")
    .showHelpAfterError();

  // -- short, single-line descriptions so `--help` is scannable. The
  //    full prose lives in docs/installer.md (Phase I8).
  program
    .command("create [slug]")
    .description(
      "scaffold a new wp-starter-kit plugin (interactive by default; " +
        "use --yes for CI)",
    )
    .action(async (slug, opts, cmd) =>
      runCreate({ slug, ...cmd.optsWithGlobals() }),
    );

  program
    .command("add <feature>")
    .description("add a feature to an existing wp-starter-kit project")
    .action(async (feature, opts, cmd) =>
      runAdd({ feature, ...cmd.optsWithGlobals() }),
    );

  program
    .command("remove <feature>")
    .description("remove a feature from an existing wp-starter-kit project")
    .action(async (feature, opts, cmd) =>
      runRemove({ feature, ...cmd.optsWithGlobals() }),
    );

  program
    .command("list")
    .description("list the features in the current project's wpsk-kit.json")
    .action(async (opts, cmd) => runList({ ...cmd.optsWithGlobals() }));

  program
    .command("update")
    .description(
      "plan (or apply with --run) a kit upgrade for the current project",
    )
    .action(async (opts, cmd) => runUpdate({ ...cmd.optsWithGlobals() }));

  program
    .command("doctor")
    .description(
      "report system prerequisites and project drift for the current project",
    )
    .action(async (opts, cmd) => runDoctor({ ...cmd.optsWithGlobals() }));

  program
    .command("info")
    .description(
      "show kit version, feature states, and available updates for the current project",
    )
    .action(async (opts, cmd) => runInfo({ ...cmd.optsWithGlobals() }));

  return program;
}

/**
 * Run the CLI. Called by `bin/wpsk.js`. We detect "bin mode" by looking
 * at `process.argv[1]` and the import path so unit tests that import
 * `buildProgram()` do not trigger parse().
 */
function isBinInvocation() {
  if (!process.argv[1]) return false;
  // Either the bin file itself, or this main.js with bin/wpsk.js as argv[1].
  return (
    process.argv[1].endsWith("wpsk") ||
    process.argv[1].endsWith("wpsk.js") ||
    process.argv[1].endsWith("bin/wpsk.js")
  );
}

if (isBinInvocation()) {
  const program = buildProgram();
  program.parseAsync(process.argv).catch((err) => {
    process.stderr.write((err && err.message) || String(err) + "\n");
    process.exit(1);
  });
}
