import {
  expect,
  jest,
  test,
  beforeEach,
  afterEach,
  describe,
} from "@jest/globals";
import { validateConfig } from "@wpsk/build";
import {
  mkdtempSync,
  writeFileSync,
  existsSync,
  rmSync,
  readFileSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Mock the plugin-side cp() — used by the asset-copy code path. The SUT
// imports {cp} statically so this mock IS applied to the SUT module.
jest.unstable_mockModule("node:fs/promises", () => ({
  cp: jest.fn(() => Promise.resolve()),
}));

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

describe("buildAssets --dry-run mode (end-to-end with real config)", () => {
  let tmpRoot;
  let originalCwd;
  let originalArgv;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), "wpsk-assets-"));
    originalCwd = process.cwd();
    originalArgv = process.argv;
  });

  afterEach(() => {
    process.chdir(originalCwd);
    process.argv = originalArgv;
    if (tmpRoot && existsSync(tmpRoot)) {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  test("does not call cp() and reports planned copies (--dry-run)", async () => {
    // Write a real build.config.json in a temp dir
    writeFileSync(
      join(tmpRoot, "build.config.json"),
      JSON.stringify({
        assetMappings: [
          { source: "mock/from-a", destination: "mock/to-a" },
          { source: "mock/from-b", destination: "mock/to-b" },
        ],
      }),
    );
    process.chdir(tmpRoot);
    process.argv = ["node", "build-assets.js", "--dry-run"];

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {});

    try {
      const sut = await import("../../build/build-assets.js");
      const result = await sut.buildAssets();

      expect(result).toEqual({ mode: "dry-run", planned: 2 });
      expect(exitSpy).not.toHaveBeenCalledWith(1);

      const allLogs = logSpy.mock.calls
        .map((c) => String(c[0] ?? ""))
        .join("\n");
      expect(allLogs).toContain("mock/from-a");
      expect(allLogs).toContain("mock/to-a");
      expect(allLogs).toContain("mock/from-b");
      expect(allLogs).toContain("mock/to-b");
      expect(allLogs.toLowerCase()).toContain("dry-run");

      // No files were actually created
      expect(existsSync(join(tmpRoot, "mock/to-a"))).toBe(false);
      expect(existsSync(join(tmpRoot, "mock/to-b"))).toBe(false);
    } finally {
      errSpy.mockRestore();
      logSpy.mockRestore();
      exitSpy.mockRestore();
    }
  });

  test("falls back to --validate semantics (validateConfig invoked, no copy)", async () => {
    writeFileSync(
      join(tmpRoot, "build.config.json"),
      JSON.stringify({ assetMappings: [] }),
    );
    process.chdir(tmpRoot);
    process.argv = ["node", "build-assets.js", "--validate"];

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {});

    try {
      const sut = await import("../../build/build-assets.js");
      const result = await sut.buildAssets();
      expect(result).toEqual({ mode: "validate", planned: 0 });
      expect(exitSpy).not.toHaveBeenCalledWith(1);
    } finally {
      errSpy.mockRestore();
      logSpy.mockRestore();
      exitSpy.mockRestore();
    }
  });

  test("buildAssets rejects when build.config.json is missing", async () => {
    // No build.config.json in tmpRoot
    process.chdir(tmpRoot);
    process.argv = ["node", "build-assets.js", "--dry-run"];

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    try {
      const sut = await import("../../build/build-assets.js");
      await expect(sut.buildAssets()).rejects.toThrow();
    } finally {
      errSpy.mockRestore();
      logSpy.mockRestore();
    }
  });

  // js-review-core (plan_18f9d2df): the error path used to log the
  // failure twice — once to console.log and once to console.error —
  // which was confusing (especially in CLI mode where the rejection
  // is swallowed by `build-assets-cli.js`). The fix logs ONCE via
  // console.error with a clear "build-assets error:" prefix and
  // re-throws. The two assertions below lock that contract.
  test("on error, logs the failure exactly once via console.error (no double-log)", async () => {
    process.chdir(tmpRoot);
    process.argv = ["node", "build-assets.js", "--dry-run"];

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    try {
      const sut = await import("../../build/build-assets.js");
      await expect(sut.buildAssets()).rejects.toThrow();
      // Exactly one error log, addressed to stderr, with the
      // canonical "build-assets error:" prefix.
      expect(errSpy).toHaveBeenCalledTimes(1);
      const errArg = String(errSpy.mock.calls[0]?.[0] ?? "");
      expect(errArg.toLowerCase()).toContain("build-assets error");
      // The old code path used to also write to console.log with
      // a fire emoji ("🔥 Error in buildAssets:"). That double-log
      // is what we want to prevent.
      const fireEmojiLogs = logSpy.mock.calls.filter((c) =>
        String(c[0] ?? "").includes("🔥"),
      );
      expect(fireEmojiLogs).toHaveLength(0);
    } finally {
      errSpy.mockRestore();
      logSpy.mockRestore();
    }
  });
});

describe("validateConfig with mock config", () => {
  test("ignores extra properties in mappings", () => {
    const configWithExtras = {
      assetMappings: [
        {
          source: "mock/source",
          destination: "mock/dest",
          extra: "ignored", // Shouldn't break validation
          options: { overwrite: true },
        },
      ],
    };
    expect(() => validateConfig(configWithExtras)).not.toThrow();
  });

  test("throws error if assetMappings is missing", () => {
    const invalidConfig = {};
    expect(() => validateConfig(invalidConfig)).toThrow(
      "assetMappings must be an array",
    );
  });

  test("accepts an empty assetMappings array", () => {
    const emptyConfig = { assetMappings: [] };
    expect(() => validateConfig(emptyConfig)).not.toThrow();
    expect(emptyConfig.assetMappings).toHaveLength(0);
  });

  test("throws error if assetMappings is not an array", () => {
    const assetMappings = {};
    expect(() => validateConfig({ assetMappings })).toThrow(
      "assetMappings must be an array",
    );
  });

  test("throws error on missing source or destination", () => {
    const invalidConfig = {
      assetMappings: [
        { destination: "mock/dest" }, // Missing source
        { source: "mock/source" }, // Missing destination
      ],
    };
    expect(() => validateConfig(invalidConfig)).toThrow(
      "Each assetMapping requires source and destination",
    );
  });

  test("throws error on non-string source or destination", () => {
    const invalidConfig = {
      assetMappings: [
        { source: 123, destination: "mock/dest" },
        { source: "mock/source", destination: null },
      ],
    };
    expect(() => validateConfig(invalidConfig)).toThrow(
      "source and destination must be strings",
    );
  });

  test("throws error on invalid options type", () => {
    const invalidConfig = {
      assetMappings: [
        {
          source: "mock/source",
          destination: "mock/dest",
          options: "not-an-object",
        },
      ],
    };
    expect(() => validateConfig(invalidConfig)).toThrow(
      "options must be an object if present",
    );
  });

  test("accepts valid globalMappings object", () => {
    const config = {
      assetMappings: [],
      globalMappings: { "tabulator-tables": "WPSK.table" },
    };
    expect(() => validateConfig(config)).not.toThrow();
  });

  test("throws when globalMappings value is not a string", () => {
    const config = {
      assetMappings: [],
      globalMappings: { "tabulator-tables": 123 },
    };
    expect(() => validateConfig(config)).toThrow(
      'globalMappings["tabulator-tables"] must be a string',
    );
  });

  test("throws when globalMappings is not an object", () => {
    const config = { assetMappings: [], globalMappings: [] };
    expect(() => validateConfig(config)).toThrow(
      "globalMappings must be an object",
    );
  });

  test("accepts valid styleEntryPoints array", () => {
    const config = {
      assetMappings: [],
      styleEntryPoints: ["assets/stylesheets/style.css"],
    };
    expect(() => validateConfig(config)).not.toThrow();
  });

  test("throws when styleEntryPoints is not an array", () => {
    const config = {
      assetMappings: [],
      styleEntryPoints: "assets/stylesheets/style.css",
    };
    expect(() => validateConfig(config)).toThrow(
      "styleEntryPoints must be an array",
    );
  });

  test("throws when styleEntryPoint item is not a string", () => {
    const config = { assetMappings: [], styleEntryPoints: [123] };
    expect(() => validateConfig(config)).toThrow(
      "Each styleEntryPoint must be a string",
    );
  });
});
