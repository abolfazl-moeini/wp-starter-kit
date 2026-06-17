/**
 * TDD test: esbuild-dependencies must build with a .ts entry point.
 *
 * p12 renamed assets/dependencies.js → assets/dependencies.ts. The
 * esbuild-dependencies config now defaults the entry to .ts. These tests
 * assert that:
 *   - buildDepsConfig accepts a .ts entry override and does not rewrite
 *     the path back to .js
 *   - buildDepsConfig's DEFAULT entry (no override) is .ts
 *   - runBuild hands the .ts entry to esbuild.build() and completes
 *
 * Mocks use jest.doMock (not unstable_mockModule) because the project's
 * babel config does not hoist unstable_mockModule calls — only the
 * synchronous jest.mock / jest.doMock path works in this environment.
 */
import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { join } from "node:path";

function setupMocks() {
  // Mock esbuild so we never invoke the real bundler. The SUT imports
  // `esbuild` statically, so the mock is wired by jest's module registry
  // before the SUT is dynamically imported.
  jest.doMock("esbuild", () => ({
    build: jest.fn(async (cfg) => ({
      metafile: {
        outputs: {
          "assets/bundles/wpdev-starter-deps.js": {
            imports: [],
            exports: [],
            entryPoint: cfg?.entryPoints?.[0] ?? "",
            bytes: 0,
            inputs: {},
          },
        },
        inputs: {},
      },
    })),
  }));
  // Mock the dependency-extraction plugin — we only need the surface
  // runBuild touches.
  jest.doMock("@wpdev/dependency-extraction-esbuild-plugin", () => ({
    importAsGlobals: jest.fn(() => ({ name: "global-imports" })),
    saveAssetFile: jest.fn(async () => true),
    phpFileContent: jest.fn((o) => `<?php return ${JSON.stringify(o)};\n`),
    writeFile: jest.fn(async (p, c) => `${p}|${c}`),
  }));
  // Mock the local build package so we don't need readBuildConfig side effects.
  jest.doMock("@wpdev/build", () => ({
    readBuildConfig: jest.fn(async () => ({
      assetMappings: [],
      globalMappings: { "tabulator-tables": "WPDev.table" },
    })),
  }));
}

describe("esbuild-dependencies — build with .ts entry point (p12 rename)", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    setupMocks();
  });

  test("buildDepsConfig accepts a .ts entry point override (no path rewrite)", async () => {
    const mod = await import("@wpdev/build/esbuild-dependencies.js");
    const config = mod.buildDepsConfig(
      {
        globalName: "WPDev",
        depsBundle: "wpdev-starter-deps.js",
        npmScope: "@wpdev",
      },
      {},
      { cwd: "/abs/project", entryPoint: "assets/dependencies.ts" },
    );
    const entry = Array.isArray(config.entryPoints)
      ? config.entryPoints[0]
      : config.entryPoints;
    expect(entry).toBe(join("/abs/project", "assets/dependencies.ts"));
  });

  test("buildDepsConfig default entryPoint resolves to .ts (not .js)", async () => {
    const mod = await import("@wpdev/build/esbuild-dependencies.js");
    const config = mod.buildDepsConfig(
      {
        globalName: "WPDev",
        depsBundle: "wpdev-starter-deps.js",
        npmScope: "@wpdev",
      },
      {},
      { cwd: "/abs/project" }, // no entryPoint override
    );
    const entry = Array.isArray(config.entryPoints)
      ? config.entryPoints[0]
      : config.entryPoints;
    expect(entry).toBe(join("/abs/project", "assets/dependencies.ts"));
    // Belt-and-suspenders: must NOT be the .js path.
    expect(entry).not.toMatch(/dependencies\.js$/);
  });

  test("runBuild hands the .ts entry to esbuild.build()", async () => {
    // Get a handle on the mocked esbuild.build BEFORE the SUT import.
    const esbuildMod = await import("esbuild");
    const buildSpy = esbuildMod.build;

    const mod = await import("@wpdev/build/esbuild-dependencies.js");
    await mod.runBuild({
      projectConfig: {
        globalName: "WPDev",
        depsBundle: "wpdev-starter-deps.js",
        npmScope: "@wpdev",
        hookPrefix: "wp",
        localizeVar: "WPLOC",
        slug: "wp",
      },
      cwd: "/abs/project",
    });

    expect(buildSpy).toHaveBeenCalledTimes(1);
    const calledConfig = buildSpy.mock.calls[0][0];
    const entry = Array.isArray(calledConfig.entryPoints)
      ? calledConfig.entryPoints[0]
      : calledConfig.entryPoints;
    expect(entry).toBe(join("/abs/project", "assets/dependencies.ts"));
  });
});
