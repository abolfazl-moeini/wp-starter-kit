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

  test("exposes a global --verbose flag", () => {
    const opts = program.options.filter((o) => o.long === "--verbose");
    expect(opts).toHaveLength(1);
  });
});
