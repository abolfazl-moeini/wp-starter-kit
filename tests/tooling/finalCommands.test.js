import { describe, test, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pkg = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8"),
);
const composer = JSON.parse(
  readFileSync(join(process.cwd(), "composer.json"), "utf8"),
);

describe("Definition of Done command contract", () => {
  test("package.json exposes quality and build scripts", () => {
    expect(pkg.scripts).toHaveProperty("typecheck");
    expect(pkg.scripts).toHaveProperty("lint:js");
    expect(pkg.scripts).toHaveProperty("format:check");
    expect(pkg.scripts).toHaveProperty("build");
    expect(pkg.scripts).toHaveProperty("check");
  });

  test("composer.json exposes test, release:dist, scope:vendor", () => {
    expect(composer.scripts).toHaveProperty("test");
    expect(composer.scripts).toHaveProperty("release:dist");
    expect(composer.scripts).toHaveProperty("scope:vendor");
    expect(composer.scripts).toHaveProperty("validate:cs");
    expect(composer.scripts).toHaveProperty("validate:phpstan");
  });
});
