import { describe, test, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("@wpsk/fetch package contract", () => {
  const pkgPath = join(process.cwd(), "packages/fetch/package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

  test("package name uses npmScope from project config", () => {
    const rootConfig = JSON.parse(
      readFileSync(join(process.cwd(), "project.config.json"), "utf8"),
    );
    expect(pkg.name).toBe(`${rootConfig.npmScope}/fetch`);
  });

  test("exports createBatchRequest from TypeScript entry", () => {
    const index = readFileSync(
      join(process.cwd(), "packages/fetch/src/index.ts"),
      "utf8",
    );
    expect(index).toMatch(/createBatchRequest/);
    expect(index).toMatch(/from ['"]\.\/handler['"]/);
  });
});
