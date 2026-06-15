import { describe, test, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildProgram } from "../../packages/cli/src/main.js";

describe("wpsk --version and --help", () => {
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

  test("--help output mentions the global --verbose flag", () => {
    const program = buildProgram();
    const help = program.helpInformation();
    expect(help).toMatch(/--verbose/);
  });

  test("--help output mentions the --version flag", () => {
    const program = buildProgram();
    const help = program.helpInformation();
    expect(help).toMatch(/--version/);
  });

  test("each subcommand has a non-empty description (so --help is useful)", () => {
    const program = buildProgram();
    for (const cmd of program.commands) {
      expect(typeof cmd.description()).toBe("string");
      expect(cmd.description().length).toBeGreaterThan(5);
    }
  });
});
