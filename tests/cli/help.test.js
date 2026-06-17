import { describe, test, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildProgram } from "../../packages/cli/src/main.js";

describe("wpdev --version and --help", () => {
  // The "version" is read from packages/cli/package.json at build
  // time, so the test asserts the live value, not a literal.
  const expectedVersion = JSON.parse(
    readFileSync(join(process.cwd(), "packages/cli/package.json"), "utf8"),
  ).version;

  test("program.version() returns the package.json version", () => {
    const program = buildProgram();
    expect(program.version()).toBe(expectedVersion);
  });

  test("--help output mentions every subcommand", () => {
    const program = buildProgram();
    const help = program.helpInformation();
    // Each command's name should appear in the help text commander
    // generates. The subcommand's short description follows it.
    for (const cmdName of [
      "create",
      "add",
      "remove",
      "list",
      "update",
      "doctor",
      "info",
    ]) {
      expect(help).toMatch(new RegExp(`\\b${cmdName}\\b`));
    }
  });

  test("--help output mentions the --version flag", () => {
    const program = buildProgram();
    const help = program.helpInformation();
    expect(help).toMatch(/--version/);
  });

  test("--help output is honest about which flags it owns (--verbose is gather.js, not commander)", () => {
    // We intentionally do NOT register --verbose / --yes at the
    // commander level; gather.js owns them via parseFlags. The
    // top-level --help therefore only shows the version/help flags.
    // Users who pass `wpdev create foo --yes` see no commander error
    // because the action forwards the raw argv to gather.js, which
    // does its own parsing.
    const program = buildProgram();
    const help = program.helpInformation();
    expect(help).not.toMatch(/--verbose/);
  });

  test("each subcommand has a non-empty description (so --help is useful)", () => {
    const program = buildProgram();
    for (const cmd of program.commands) {
      expect(typeof cmd.description()).toBe("string");
      expect(cmd.description().length).toBeGreaterThan(5);
    }
  });
});
