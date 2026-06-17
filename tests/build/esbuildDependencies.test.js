import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import path from "node:path";

describe("esbuild-dependencies", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  // Mock esbuild so we never invoke the real bundler
  jest.unstable_mockModule("esbuild", () => ({
    build: jest.fn(async () => ({
      metafile: {
        outputs: {
          "assets/bundles/wpdev-starter-deps.js": {
            imports: [],
            exports: [],
            entryPoint: "",
            bytes: 0,
            inputs: {},
          },
        },
        inputs: {},
      },
    })),
  }));

  // Mock the dependency-extraction-esbuild-plugin so we don't need to wire the
  // full WP global-mapping logic. We only need a stable importAsGlobals
  // factory, and we need the saveAssetFile / phpFileContent / writeFile API
  // surface that buildDepsConfig touches.
  jest.unstable_mockModule(
    "@wpdev/dependency-extraction-esbuild-plugin",
    () => {
      const importAsGlobals = jest.fn(() => ({ name: "global-imports" }));
      const saveAssetFile = jest.fn(async () => true);
      const phpFileContent = jest.fn(
        (o) => `<?php return ${JSON.stringify(o)};\n`,
      );
      const writeFile = jest.fn(async (p, c) => `${p}|${c}`);
      return { importAsGlobals, saveAssetFile, phpFileContent, writeFile };
    },
  );

  // Mock the local build package so we don't need readBuildConfig side effects.
  jest.unstable_mockModule("@wpdev/build", () => ({
    readBuildConfig: jest.fn(async () => ({
      assetMappings: [],
      globalMappings: { "tabulator-tables": "WPDev.table" },
    })),
  }));

  test("buildDepsConfig returns esbuild config with globalName from projectConfig", async () => {
    const mod = await import("@wpdev/build/esbuild-dependencies.js");
    const config = mod.buildDepsConfig({
      globalName: "WPDev",
      depsBundle: "wpdev-starter-deps.js",
      npmScope: "@wpdev",
    });
    expect(config.globalName).toBe("WPDev");
  });

  test("buildDepsConfig uses outfile = assets/bundles/<depsBundle>", async () => {
    const mod = await import("@wpdev/build/esbuild-dependencies.js");
    const config = mod.buildDepsConfig(
      {
        globalName: "WPDev",
        depsBundle: "wpdev-starter-deps.js",
        npmScope: "@wpdev",
      },
      {},
      { cwd: "/abs/project" },
    );
    expect(config.outfile).toBe(
      path.join("/abs/project", "assets/bundles/wpdev-starter-deps.js"),
    );
  });

  test("buildDepsConfig format is iife", async () => {
    const mod = await import("@wpdev/build/esbuild-dependencies.js");
    const config = mod.buildDepsConfig({
      globalName: "WPDev",
      depsBundle: "wpdev-starter-deps.js",
      npmScope: "@wpdev",
    });
    expect(config.format).toBe("iife");
  });

  test("buildDepsConfig plugins array is non-empty", async () => {
    const mod = await import("@wpdev/build/esbuild-dependencies.js");
    const config = mod.buildDepsConfig({
      globalName: "WPDev",
      depsBundle: "wpdev-starter-deps.js",
      npmScope: "@wpdev",
    });
    expect(Array.isArray(config.plugins)).toBe(true);
    expect(config.plugins.length).toBeGreaterThan(0);
  });

  test("buildDepsConfig sets entryPoint to assets/dependencies.ts", async () => {
    const mod = await import("@wpdev/build/esbuild-dependencies.js");
    const config = mod.buildDepsConfig(
      {
        globalName: "WPDev",
        depsBundle: "wpdev-starter-deps.js",
        npmScope: "@wpdev",
      },
      {},
      { cwd: "/abs/project" },
    );
    // esbuild accepts entryPoints (string or array) — accept either
    const entry = Array.isArray(config.entryPoints)
      ? config.entryPoints[0]
      : config.entryPoints;
    // p12 rename: the canonical entry is now the .ts file. The .js entry
    // is gone (see tests/build/dependenciesEntry.test.js for the file-
    // existence contract).
    expect(entry).toBe(path.join("/abs/project", "assets/dependencies.ts"));
  });

  test("buildDepsConfig uses globalMappings from buildConfig when supplied", async () => {
    const mod = await import("@wpdev/build/esbuild-dependencies.js");
    const config = mod.buildDepsConfig(
      {
        globalName: "WPDev",
        depsBundle: "wpdev-starter-deps.js",
        npmScope: "@wpdev",
      },
      { globalMappings: { foo: "WPDev.foo" } },
    );
    // Plugins should exist; globalMappings are passed to importAsGlobals inside.
    // We assert the surface (non-empty plugins) — the integration test (1.1.x)
    // verifies the mapping is wired through.
    expect(config.plugins.length).toBeGreaterThan(0);
  });
});
