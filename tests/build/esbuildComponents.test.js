import { describe, test, expect } from "@jest/globals";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("esbuild-components", () => {
  test("uses Promise.all to await parallel component builds", () => {
    const source = readFileSync(
      join(process.cwd(), "core/packages/build/esbuild-components.js"),
      "utf8",
    );
    expect(source).toContain("await Promise.all");
    expect(source).toContain("jsfiles.map");
    // Source may use either single or double quotes — accept both.
    expect(source).toMatch(/['"]examples\/\*\*['"]/);
  });

  test("discovers src/Modules/*/assets/entries/*.ts module entry glob", () => {
    const source = readFileSync(
      join(process.cwd(), "core/packages/build/esbuild-components.js"),
      "utf8",
    );
    expect(source).toContain("src/Modules/*/assets/entries/*.ts");
    expect(source).toMatch(/MODULE_ENTRY_GLOB|moduleEntries/);
  });

  test("names module bundles as <Module>-<entry>.js", () => {
    const source = readFileSync(
      join(process.cwd(), "core/packages/build/esbuild-components.js"),
      "utf8",
    );
    expect(source).toMatch(/moduleName.*entryName|ExampleFeature-admin/);
  });

  test("buildComponents resolves when no component scripts exist", async () => {
    const emptyDir = mkdtempSync(join(tmpdir(), "wpsk-components-"));
    try {
      const { buildComponents } =
        await import("@core/build/esbuild-components.js");
      expect(typeof buildComponents).toBe("function");
      await expect(
        buildComponents({
          projectConfig: {
            globalName: "Test",
            hookPrefix: "test",
            npmScope: "@test",
            depsBundle: "test.js",
            localizeVar: "TestLoc",
            slug: "test",
          },
          buildConfig: { globalMappings: {}, styleEntryPoints: [] },
          cwd: emptyDir,
        }),
      ).resolves.toBeUndefined();
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});
