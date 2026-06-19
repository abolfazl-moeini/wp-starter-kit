/**
 * @wpdev/cli — main entry. Wires the `commander` program with subcommands
 * (`create`, `add`, `remove`, `list`, `update`, `doctor`, `info`) and the
 * global `--version` / `--help` flags. The action bodies live in
 * `src/commands/*.js`; this module is the dispatcher.
 *
 * Exporting `buildProgram()` lets unit tests inspect the program tree
 * without spawning a child process.
 *
 * NOTE: This file must remain Jest-importable (babel-jest does not
 * transform `import.meta`). We therefore resolve the package's
 * `package.json` via `process.cwd()` + a relative path, matching the
 * convention used by `packages/create-wp-project/src/index.js`.
 *
 * Design note: We use commander for *subcommand dispatch* + global
 * `--version`/`--help` only. All per-command flags (the 30+ in
 * `plan.installer.md` Appendix A) are parsed by `gather.js` via its
 * own `parseFlags` registry. This keeps commander free of the
 * feature/answer/runOptions vocabulary (which would force us to
 * re-declare every flag on every subcommand) and centralizes
 * unknown-flag errors in one place.
 */
import { Command } from "commander";

import { runCreate } from "./commands/create.js";
import {
  normalizePositionalSlug,
  resolveCreateTargetDir,
} from "./resolveTargetDir.js";
import { runAdd } from "./commands/add.js";
import { runRemove } from "./commands/remove.js";
import { runList } from "./commands/list.js";
import { runUpdate } from "./commands/update.js";
import { runDoctor } from "./commands/doctor.js";
import { runInfo } from "./commands/info.js";
import { runSet } from "./commands/set.js";
import { gatherInputs } from "./gather.js";
import ui from "./ui.js";
import * as runners from "./runners.js";
// Single source of truth: the engine's `package.json` version.
// I7.6 wires `wpdev --version` to this so a `npm version patch`
// in `packages/create-wp-project` automatically propagates to
// the CLI's reported version (no manual sync step).
import { getKitVersion } from "./version.js";
// The real engine — Phase 20+21 work in `packages/create-wp-project`.
// We import it directly here (the bin is the only place that
// should ever need the real engine; unit tests inject fakes).
import * as engine from "@wpdev/create-wp-project";

/**
 * Slice the raw argv tail (everything after the subcommand name)
 * and hand it to the subcommand's action. We do this rather than
 * letting commander parse every flag so that the gather pipeline
 * owns the 30+ feature/answer/runOptions flags (see the design
 * note at the top of this file).
 *
 * @param {import('commander').Command} subcmd  commander command instance
 * @returns {string[]} argv tail after the subcommand name
 */
function tailAfterSubcommand(subcmd) {
  const argv = process.argv.slice(2);
  if (!subcmd) return argv;
  // The subcommand name is the first token in argv (when the user
  // ran `wpdev <sub> ...`). We strip it so gather.js sees only flags.
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === subcmd.name()) {
      return argv.slice(i + 1);
    }
  }
  return argv;
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
    .name("wpdev")
    .description(
      "Command-line installer for wp-starter-kit plugins. " +
        "Scaffolds new projects, adds/removes features, and updates " +
        "existing projects to a newer kit version.",
    )
    .version(
      getKitVersion(),
      "-V, --version",
      "print wpdev version and exit (mirrors the engine's version)",
    )
    // The 30+ feature/answer/runOptions flags (Appendix A) are
    // parsed by gather.js, not by commander. `allowUnknownOption`
    // tells commander to forward every flag (declared or not) to
    // the subcommand's action, where we re-extract the raw argv
    // tail and hand it to `parseFlags`. Unknown-flag errors are
    // then produced by parseFlags (in the canonical Appendix A
    // list), not by commander.
    .allowUnknownOption()
    .showHelpAfterError();

  // -- short, single-line descriptions so `--help` is scannable. The
  //    full prose lives in docs/installer.md (Phase I8).

  // Every subcommand also needs allowUnknownOption() because
  // commander does not propagate that setting from the program.
  // Without it, the subcommand parser rejects --yes / --verbose
  // (and any other Appendix A flag) with "unknown option".
  const allowPassthrough = (cmd) => cmd.allowUnknownOption();

  allowPassthrough(
    program
      .command("create [slug]")
      .description(
        "scaffold a new wp-starter-kit plugin (interactive by default; " +
          "use --yes for CI)",
      ),
  ).action(async (slug) => {
    const sub = program.commands.find((c) => c.name() === "create");
    const argv = tailAfterSubcommand(sub);

    // 1. Gather the resolved { answers, features, runOptions }
    //    (gatherInputs handles prompts, defaults, flag-merge,
    //    and validation — including the fail-fast I2.8 gate).
    const positionalSlug = normalizePositionalSlug(slug);
    let resolved;
    try {
      resolved = await gatherInputs({
        argv,
        cwd: process.cwd(),
        positionalSlug,
        validateTargetDir: true,
      });
    } catch (err) {
      if (err && err.code === "WPDEV_TARGET_DIR_NOT_EMPTY") {
        const fatal = await ui.renderFatalError({
          title: "Directory is not empty",
          body: err.targetDir || err.message,
          hint: err.hint,
          footer: "Scaffold cancelled",
        });
        process.exit(fatal.code);
      }
      throw err;
    }

    if (!resolved.validation.ok) {
      // Re-emit a clean error line + exit 1. The gather
      // pipeline already threw on the same condition in
      // fail-fast mode (flag-derived combos); this branch is
      // reached only when the prompt-derived final set is
      // invalid (the user typed something contradictory at the
      // terminal). The bin layer shows a single readable
      // message.
      process.stderr.write("wpdev create: invalid feature combination:\n");
      for (const [k, msg] of Object.entries(resolved.validation.errors || {})) {
        process.stderr.write("  " + k + ": " + msg + "\n");
      }
      process.exit(1);
    }

    // 2. Resolve the target dir: --dir= if set, else the positional
    //    slug as a subdirectory, else the current working directory
    //    (scaffold in-place when no slug was passed).
    const targetDir = resolveCreateTargetDir({
      cwd: process.cwd(),
      runOptions: resolved.runOptions,
      positionalSlug,
    });

    // 3. Drive runCreate. The bin layer wires the real
    //    engine + runners + ui; runCreate stays pure and
    //    unit-testable with fakes.
    const spinner =
      typeof ui.spinner === "function"
        ? await ui.spinner({ message: "Scaffolding project…" })
        : null;
    spinner?.start?.();

    const result = await runCreate(
      {
        slug: positionalSlug || resolved.answers.slug,
        dir: targetDir,
        answers: resolved.answers,
        features: resolved.features,
        runOptions: resolved.runOptions,
      },
      {
        engine,
        runners,
        ui,
        // readEnginePackageVersion is the default impl in
        // commands/create.js (it reads the on-disk
        // packages/create-wp-project/package.json). We don't
        // override it here; tests can inject a fake.
      },
    );

    // 4. Render the summary + next-steps panels, then exit
    //    0/1 based on the result.
    if (!result.ok) {
      spinner?.stop?.("Scaffold failed", 1);
      const reason = result.reason || "unknown";
      const fatal = await ui.renderFatalError(
        reason.includes("not empty")
          ? {
              title: "Directory is not empty",
              body: targetDir,
              hint: "Pass --force to overwrite, or scaffold into an empty directory.",
              footer: "Scaffold cancelled",
            }
          : {
              title: "Scaffold failed",
              body: reason,
              footer: "Scaffold cancelled",
            },
      );
      process.exit(fatal.code);
    }

    spinner?.stop?.("Project scaffolded");

    if (result.warnings && result.warnings.length > 0) {
      process.stderr.write("\nwarnings:\n");
      for (const w of result.warnings) {
        process.stderr.write("  - " + w + "\n");
      }
    }

    // Print the summary panel + the next-steps panel. The ui
    // helper handles the stdout writes.
    await ui.renderSummary({
      answers: resolved.answers,
      features: resolved.features,
      runOptions: { ...resolved.runOptions, targetDir },
    });
    await ui.renderNextSteps(resolved.features, {
      ...resolved.runOptions,
      targetDir,
    });
  });

  allowPassthrough(
    program
      .command("add [feature]")
      .description("add a feature to an existing wp-starter-kit project")
      .option("--list", "list available features and their enabled state")
      .option("--variant <variant>", "feature variant to add")
      .option("-y, --yes", "skip confirmation prompts")
      .option("--install", "run npm install / composer install after adding")
      .option("-f, --force", "force overwrite of existing files")
      .option("-v, --verbose", "verbose runner output"),
  ).action(async (feature) => {
    const sub = program.commands.find((c) => c.name() === "add");
    const opts = sub?.opts() || {};
    const dir = process.cwd();
    if (!opts.list && (!feature || feature.length === 0)) {
      process.stderr.write("wpdev add: feature id required (or pass --list)\n");
      process.exit(1);
      return;
    }
    const featureId = feature
      ? feature.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
      : "";
    const result = await runAdd(
      {
        dir,
        featureId,
        variant: opts.variant,
        runOptions: {
          list: opts.list,
          yes: opts.yes,
          force: opts.force,
          install: opts.install,
          verbose: opts.verbose,
        },
      },
      { engine, runners, ui },
    );
    if (!result.ok) {
      process.stderr.write("wpdev add: " + (result.reason || "unknown") + "\n");
      process.exit(result.reason === "cancelled" ? 0 : 1);
    }
  });

  allowPassthrough(
    program
      .command("remove <feature>")
      .description("remove a feature from an existing wp-starter-kit project")
      .option("-y, --yes", "skip confirmation prompts")
      .option("-f, --force", "force removal")
      .option("-v, --verbose", "verbose runner output"),
  ).action(async (feature) => {
    const sub = program.commands.find((c) => c.name() === "remove");
    const opts = sub?.opts() || {};
    const featureId = feature.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const result = await runRemove(
      {
        dir: process.cwd(),
        featureId,
        runOptions: {
          yes: opts.yes,
          force: opts.force,
          verbose: opts.verbose,
        },
      },
      { engine, runners, ui },
    );
    if (result.skipped) {
      process.stdout.write(result.reason + "\n");
      return;
    }
    if (!result.ok) {
      process.stderr.write(
        "wpdev remove: " + (result.reason || "unknown") + "\n",
      );
      process.exit(result.reason === "cancelled" ? 0 : 1);
    }
  });

  allowPassthrough(
    program
      .command("set <key> <value>")
      .description(
        "set a config-only feature variant (phpMinVersion, wpMinVersion, license, ci)",
      ),
  ).action(async (key, value) => {
    const result = await runSet({ dir: process.cwd(), key, value }, { engine });
    if (!result.ok) {
      process.stderr.write("wpdev set: " + (result.reason || "unknown") + "\n");
      process.exit(1);
    }
  });

  allowPassthrough(
    program
      .command("list")
      .description("list the features in the current project's wpdev-kit.json")
      .option("--json", "emit machine-readable JSON instead of a table"),
  ).action(async () => {
    return runList(process.cwd(), { engine, ui });
  });

  allowPassthrough(
    program
      .command("update [dir]")
      .description(
        "plan (default) or apply (--run) a kit upgrade for the current project",
      )
      .option(
        "--to <version>",
        "target kit version (default: registry's _kit entry)",
      )
      .option("--run", "apply the plan (default: dry-run only)")
      .option("--force", "apply even with a dirty git tree")
      .option("-v, --verbose", "verbose runner output"),
  ).action(async (dir) => {
    const sub = program.commands.find((c) => c.name() === "update");
    const argv = tailAfterSubcommand(sub);
    // The runOptions are read from the raw argv tail. We keep
    // the parsing local (per-command) so we don't need a
    // global flag registry.
    const runOptions = parseUpdateRunOptions(argv);
    const targetDir = dir || process.cwd();
    const result = await runUpdate(
      { dir: targetDir, runOptions },
      { engine, runners, ui },
    );
    if (!result.ok) {
      process.stderr.write(
        "wpdev update: " + (result.reason || "unknown") + "\n",
      );
      process.exit(1);
    }
    if (result.warning) {
      process.stderr.write("wpdev update: " + result.warning + "\n");
    }
  });

  allowPassthrough(
    program
      .command("doctor [dir]")
      .description(
        "report system prerequisites and project drift for the current project",
      )
      .option(
        "--json",
        "emit machine-readable JSON instead of the report panel",
      ),
  ).action(async (dir) => {
    const sub = program.commands.find((c) => c.name() === "doctor");
    const argv = tailAfterSubcommand(sub);
    const runOptions = { json: argv.indexOf("--json") !== -1 };
    const targetDir = dir || process.cwd();
    const result = await runDoctor(
      { dir: targetDir, runOptions },
      { engine, ui },
    );
    if (!result.ok && !result.report) {
      process.stderr.write(
        "wpdev doctor: " + (result.reason || "unknown") + "\n",
      );
      process.exit(1);
    }
    // The doctor encodes its exit code in the result; honour
    // it so CI can distinguish "clean" / "warnings" / "errors".
    if (typeof result.code === "number" && result.code !== 0) {
      process.exit(result.code);
    }
  });

  allowPassthrough(
    program
      .command("info [dir]")
      .description(
        "show kit version, feature states, and available updates for the current project",
      )
      .option("--json", "emit machine-readable JSON instead of the info panel"),
  ).action(async (dir) => {
    const sub = program.commands.find((c) => c.name() === "info");
    const argv = tailAfterSubcommand(sub);
    const result = await runInfo(
      {
        dir: dir || process.cwd(),
        runOptions: { json: argv.indexOf("--json") !== -1 },
        argv,
      },
      { engine, ui, lookupLatestKit: runners.lookupLatestKit },
    );
    if (!result.ok) {
      process.stderr.write(
        "wpdev info: " + (result.reason || "unknown") + "\n",
      );
      process.exit(1);
    }
  });

  return program;
}

/**
 * Parse the `wpdev update` flags from the raw argv tail. The
 * `update` subcommand has only four flags (see plan I5.1–I5.4):
 * `--to`, `--run`, `--force`, `--verbose`. We parse them
 * locally rather than going through `parseFlags` (which is
 * scoped to the create-time feature/answer/runOptions
 * vocabulary).
 *
 * The function is defensive: unknown extra args are ignored,
 * missing values default to the documented defaults. Tests
 * don't currently exercise it (they call `runUpdate` directly
 * with the resolved `runOptions`); the function is exercised
 * by the bin layer's smoke test.
 *
 * @param {string[]} argv
 * @returns {{run?: boolean, to?: string, force?: boolean, verbose?: boolean}}
 */
function parseUpdateRunOptions(argv) {
  const out = {};
  if (!Array.isArray(argv)) return out;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--run") out.run = true;
    else if (a === "--force") out.force = true;
    else if (a === "--verbose" || a === "-v") out.verbose = true;
    else if (a === "--to" && i + 1 < argv.length) {
      out.to = argv[++i];
    } else if (typeof a === "string" && a.startsWith("--to=")) {
      out.to = a.slice("--to=".length);
    }
  }
  return out;
}

/**
 * Run the CLI. Called by `bin/wpdev.js`. We detect "bin mode" by looking
 * at `process.argv[1]` and the import path so unit tests that import
 * `buildProgram()` do not trigger parse().
 */
function isBinInvocation() {
  if (!process.argv[1]) return false;
  // Either the bin file itself, or this main.js with bin/wpdev.js as argv[1].
  return (
    process.argv[1].endsWith("wpdev") ||
    process.argv[1].endsWith("wpdev.js") ||
    process.argv[1].endsWith("bin/wpdev.js")
  );
}

if (isBinInvocation()) {
  const program = buildProgram();
  program.parseAsync(process.argv).catch((err) => {
    process.stderr.write((err && err.message) || String(err) + "\n");
    process.exit(1);
  });
}
