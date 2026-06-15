/**
 * @wpsk/cli — main entry. Wires the `commander` program with subcommands
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
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { runCreate } from "./commands/create.js";
import { runAdd } from "./commands/add.js";
import { runRemove } from "./commands/remove.js";
import { runList } from "./commands/list.js";
import { runUpdate } from "./commands/update.js";
import { runDoctor } from "./commands/doctor.js";
import { runInfo } from "./commands/info.js";
import { gatherInputs } from "./gather.js";
import ui from "./ui.js";
import * as runners from "./runners.js";
// The real engine — Phase 20+21 work in `packages/create-wp-project`.
// We import it directly here (the bin is the only place that
// should ever need the real engine; unit tests inject fakes).
import * as engine from "@wpsk/create-wp-project";

/**
 * Resolve the on-disk path of the package.json that declares our
 * version. Resolution order:
 *   1. `cwd()/packages/cli/package.json` (kit's local workspace)
 *   2. `cwd()/package.json` (when invoked from inside the
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
  // ran `wpsk <sub> ...`). We strip it so gather.js sees only flags.
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
    .name("wpsk")
    .description(
      "Command-line installer for wp-starter-kit plugins. " +
        "Scaffolds new projects, adds/removes features, and updates " +
        "existing projects to a newer kit version.",
    )
    .version(readCliVersion(), "-V, --version", "print wpsk version and exit")
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
    const resolved = await gatherInputs({ argv });

    if (!resolved.validation.ok) {
      // Re-emit a clean error line + exit 1. The gather
      // pipeline already threw on the same condition in
      // fail-fast mode (flag-derived combos); this branch is
      // reached only when the prompt-derived final set is
      // invalid (the user typed something contradictory at the
      // terminal). The bin layer shows a single readable
      // message.
      process.stderr.write("wpsk create: invalid feature combination:\n");
      for (const [k, msg] of Object.entries(resolved.validation.errors || {})) {
        process.stderr.write("  " + k + ": " + msg + "\n");
      }
      process.exit(1);
    }

    // 2. Resolve the target dir: --dir= if set, else the
    //    positional slug, else the sanitized answers.slug.
    const targetDir =
      resolved.runOptions.targetDir || slug || resolved.answers.slug || ".";

    // 3. Drive runCreate. The bin layer wires the real
    //    engine + runners + ui; runCreate stays pure and
    //    unit-testable with fakes.
    const result = await runCreate(
      {
        slug: slug || resolved.answers.slug,
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
      process.stderr.write(
        "wpsk create failed: " + (result.reason || "unknown") + "\n",
      );
      process.exit(1);
    }

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
      .command("add <feature>")
      .description("add a feature to an existing wp-starter-kit project")
      .option("--variant <variant>", "feature variant to add")
      .option("-y, --yes", "skip confirmation prompts")
      .option("--install", "run npm install / composer install after adding")
      .option("-f, --force", "force overwrite of existing files")
      .option("-v, --verbose", "verbose runner output"),
  ).action(async (feature) => {
    const sub = program.commands.find((c) => c.name() === "add");
    return runAdd({ feature, argv: tailAfterSubcommand(sub) });
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
    return runRemove({ feature, argv: tailAfterSubcommand(sub) });
  });

  allowPassthrough(
    program
      .command("list")
      .description("list the features in the current project's wpsk-kit.json")
      .option("--json", "emit machine-readable JSON instead of a table"),
  ).action(async () => {
    const sub = program.commands.find((c) => c.name() === "list");
    return runList({ argv: tailAfterSubcommand(sub) });
  });

  allowPassthrough(
    program
      .command("update")
      .description(
        "plan (or apply with --run) a kit upgrade for the current project",
      ),
  ).action(async () => {
    const sub = program.commands.find((c) => c.name() === "update");
    return runUpdate({ argv: tailAfterSubcommand(sub) });
  });

  allowPassthrough(
    program
      .command("doctor")
      .description(
        "report system prerequisites and project drift for the current project",
      ),
  ).action(async () => {
    const sub = program.commands.find((c) => c.name() === "doctor");
    return runDoctor({ argv: tailAfterSubcommand(sub) });
  });

  allowPassthrough(
    program
      .command("info")
      .description(
        "show kit version, feature states, and available updates for the current project",
      ),
  ).action(async () => {
    const sub = program.commands.find((c) => c.name() === "info");
    return runInfo({ argv: tailAfterSubcommand(sub) });
  });

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
