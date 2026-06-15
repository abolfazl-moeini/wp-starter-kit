import { describe, test, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("final audit", () => {
  test("architecture doc describes plugin-first bootstrap", () => {
    const arch = readFileSync(
      join(process.cwd(), "docs/architecture.md"),
      "utf8",
    );
    expect(arch).toMatch(/plugin|ModuleLoader|src\//i);
  });

  test("wpsk-starter.php exists for starter repo dogfood", () => {
    const plugin = readFileSync(
      join(process.cwd(), "wpsk-starter.php"),
      "utf8",
    );
    expect(plugin).toMatch(/Plugin::boot/);
    expect(plugin).toMatch(/ExampleFeature/);
  });
});
