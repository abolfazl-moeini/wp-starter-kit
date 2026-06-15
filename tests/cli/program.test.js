import { describe, test, expect } from "@jest/globals";

import { buildProgram } from "../../packages/cli/src/main.js";

describe("buildProgram()", () => {
  const program = buildProgram();
  const commandNames = program.commands.map((c) => c.name());

  test("uses 'wpsk' as the program name", () => {
    expect(program.name()).toBe("wpsk");
  });

  test("registers every subcommand from the plan", () => {
    // The exact set the plan §2 architecture diagram and §3 phase map
    // require. Order is not asserted (commander stores in insertion
    // order but we don't want to lock the UI to one ordering).
    const required = [
      "create",
      "add",
      "remove",
      "list",
      "update",
      "doctor",
      "info",
    ];
    for (const name of required) {
      expect(commandNames).toContain(name);
    }
  });

  test("exposes a global --version flag (commander's auto-added one)", () => {
    // commander exposes a synthetic version flag. It shows up in
    // help output, and the program.version() call wires the value
    // to `program.version()`.
    expect(typeof program.version()).toBe("string");
    expect(program.version()).toMatch(/^\d+\.\d+\.\d+/);
  });

  test("does NOT register --verbose globally (gather.js owns it via parseFlags)", () => {
    // The 30+ Appendix A flags (including --verbose and --yes) are
    // owned by `parseFlags()` so we don't re-declare them on every
    // subcommand. The program only owns commander-level options.
    const opts = program.options.filter((o) => o.long === "--verbose");
    expect(opts).toHaveLength(0);
  });
});

/* -------------------------------------------------------------------- */
/* Per-subcommand help text (Phase I4 smoke)                              */
/* -------------------------------------------------------------------- */

describe("subcommand --help text (Phase I4 smoke)", () => {
  // The 30+ feature/answer/runOptions flags live in parseFlags, so
  // commander does not auto-list them. To make `wpsk <sub> --help`
  // discoverable, every subcommand includes a "Flags" block via
  // .addHelpText("after", ...). These tests lock that contract:
  // a user reading --help should see the flags they can pass for
  // that subcommand.

  function helpFor(name) {
    const program = buildProgram();
    const sub = program.commands.find((c) => c.name() === name);
    return sub.helpInformation();
  }

  test("wpsk add --help lists the add-relevant flags", () => {
    const help = helpFor("add");
    for (const flag of [
      "--variant",
      "--yes",
      "--force",
      "--verbose",
      "--install",
    ]) {
      expect(help).toMatch(flag);
    }
  });

  test("wpsk remove --help lists the remove-relevant flags (no --variant, no --install)", () => {
    const help = helpFor("remove");
    for (const flag of ["--yes", "--force", "--verbose"]) {
      expect(help).toMatch(flag);
    }
    // remove intentionally has neither --variant nor --install —
    // it cannot pick a variant and does not need to re-run an
    // installer (the engine's own sync handles any package.json
    // changes). Lock this so a future "add remove's flags for
    // symmetry" patch is caught in review.
    expect(help).not.toMatch(/--variant/);
    expect(help).not.toMatch(/--install/);
  });

  test("wpsk list --help mentions --json (machine output flag)", () => {
    const help = helpFor("list");
    expect(help).toMatch(/--json/);
  });

  test("wpsk info --help mentions --json (machine output flag, Phase I5)", () => {
    const help = helpFor("info");
    expect(help).toMatch(/--json/);
  });

  test("wpsk info --help mentions the [dir] positional argument (Phase I5)", () => {
    // The user can run `wpsk info` (cwd) or `wpsk info /abs/proj`
    // (explicit target). commander renders positional arg names
    // in brackets, so we look for the bare 'dir' in the usage
    // line.
    const help = helpFor("info");
    expect(help).toMatch(/\[dir\]/);
  });
});
