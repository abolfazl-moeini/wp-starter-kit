import { describe, test, expect } from "@jest/globals";
import {
  readFileSync,
  mkdtempSync,
  rmSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";

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

  test("ignores dist, nested node_modules, and examples when discovering entries", () => {
    const source = readFileSync(
      join(process.cwd(), "core/packages/build/esbuild-components.js"),
      "utf8",
    );
    expect(source).toMatch(/\*\*\/node_modules\/\*\*/);
    expect(source).toMatch(/['"]dist\/\*\*['"]/);
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

  test("reads uiFramework via getJsxOptions for automatic JSX runtime", () => {
    const source = readFileSync(
      join(process.cwd(), "core/packages/build/esbuild-components.js"),
      "utf8",
    );
    expect(source).toContain("getJsxOptions");
    expect(source).toContain("getReactAliases");
    expect(source).toContain("projectConfig.uiFramework");
  });

  test("names module bundles as <Module>-<entry>.js", () => {
    const source = readFileSync(
      join(process.cwd(), "core/packages/build/esbuild-components.js"),
      "utf8",
    );
    expect(source).toMatch(/moduleName.*entryName|ExampleFeature-admin/);
  });

  test("npm run build:components emits ExampleFeature-admin bundle in kit", () => {
    execSync("npm run build:components", {
      cwd: process.cwd(),
      stdio: "pipe",
    });
    expect(
      existsSync(join(process.cwd(), "assets/bundles/ExampleFeature-admin.js")),
    ).toBe(true);
    expect(
      existsSync(
        join(process.cwd(), "assets/bundles/ExampleFeature-admin.asset.php"),
      ),
    ).toBe(true);
  });

  test("throws a clear error when depsBundle is missing", async () => {
    const { buildComponents } =
      await import("@wpdev/build/esbuild-components.js");
    const emptyDir = mkdtempSync(join(tmpdir(), "wpdev-components-"));
    const entryDir = join(emptyDir, "src/Modules/Demo/assets/entries");
    mkdirSync(entryDir, { recursive: true });
    writeFileSync(join(entryDir, "admin.ts"), "export {};\n", "utf8");
    try {
      await expect(
        buildComponents({
          projectConfig: {
            globalName: "Test",
            hookPrefix: "test",
            npmScope: "@test",
            localizeVar: "TestLoc",
            slug: "test",
          },
          buildConfig: { globalMappings: {}, styleEntryPoints: [] },
          cwd: emptyDir,
        }),
      ).rejects.toThrow(/missing 'depsBundle'/);
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  test("buildComponents resolves when no component scripts exist", async () => {
    const emptyDir = mkdtempSync(join(tmpdir(), "wpdev-components-"));
    try {
      const { buildComponents } =
        await import("@wpdev/build/esbuild-components.js");
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
