import {
  describe,
  test,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import {
  mkdtempSync,
  writeFileSync,
  existsSync,
  rmSync,
  chmodSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("build-all orchestration (real subprocess, e2e)", () => {
  let tmpRoot;
  let originalCwd;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    tmpRoot = mkdtempSync(join(tmpdir(), "wpsk-buildall-"));
    originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (tmpRoot && existsSync(tmpRoot)) {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  function writeFakeNpmScript(name) {
    // Create a fake "npm run <name>" runner by writing a minimal package.json
    // and using `node -e` as the script. We then call the real npm
    // binary against this directory; the real npm will pick up the script.
    const pkgPath = join(tmpRoot, "package.json");
    if (!existsSync(pkgPath)) {
      writeFileSync(
        pkgPath,
        JSON.stringify(
          {
            name: "fake-buildall",
            private: true,
            scripts: {},
          },
          null,
          2,
        ),
      );
    }
    const pkg = JSON.parse(require("node:fs").readFileSync(pkgPath, "utf8"));
    pkg.scripts[name] = 'node -e "process.exit(0)"';
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  }

  test("SUB_BUILDERS exports the canonical four-step pipeline", async () => {
    const mod = await import("../../core/packages/build/build-all.js");
    expect(mod.SUB_BUILDERS).toEqual([
      "build:dependencies",
      "build:components",
      "build:styles",
      "build:assets",
    ]);
  });

  test("runBuildAll resolves when all sub-builders exit 0", async () => {
    // Set up a fake package.json with all four sub-builders as no-op scripts
    writeFileSync(
      join(tmpRoot, "package.json"),
      JSON.stringify(
        {
          name: "fake-buildall",
          private: true,
          scripts: {
            "build:dependencies": 'node -e "process.exit(0)"',
            "build:components": 'node -e "process.exit(0)"',
            "build:styles": 'node -e "process.exit(0)"',
            "build:assets": 'node -e "process.exit(0)"',
          },
        },
        null,
        2,
      ),
    );

    process.chdir(tmpRoot);

    const mod = await import("../../core/packages/build/build-all.js");
    const result = await mod.runBuildAll();
    expect(result.failures).toEqual([]);
    expect(result.results).toHaveLength(4);
    result.results.forEach((r) => expect(r.status).toBe(0));
  });

  test("runBuildAll rejects with structured failures list when a sub-builder fails", async () => {
    writeFileSync(
      join(tmpRoot, "package.json"),
      JSON.stringify(
        {
          name: "fake-buildall",
          private: true,
          scripts: {
            "build:dependencies": 'node -e "process.exit(0)"',
            "build:components": 'node -e "process.exit(1)"', // FAILS
            "build:styles": 'node -e "process.exit(0)"',
            "build:assets": 'node -e "process.exit(0)"',
          },
        },
        null,
        2,
      ),
    );

    process.chdir(tmpRoot);

    const mod = await import("../../core/packages/build/build-all.js");
    await expect(mod.runBuildAll()).rejects.toMatchObject({
      failures: expect.arrayContaining(["build:components"]),
    });
  });

  test("runScript with captureStdout accumulates stdout into the result", async () => {
    writeFileSync(
      join(tmpRoot, "package.json"),
      JSON.stringify(
        {
          name: "fake-buildall",
          private: true,
          scripts: {
            "build:noop":
              "node -e \"process.stdout.write('hello-from-npm\\\\n')\"",
          },
        },
        null,
        2,
      ),
    );

    process.chdir(tmpRoot);

    const mod = await import("../../core/packages/build/build-all.js");
    // Suppress process.stdout.write passthrough so jest output stays clean
    const writeSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    try {
      const result = await mod._runScript("build:noop", {
        captureStdout: true,
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("hello-from-npm");
    } finally {
      writeSpy.mockRestore();
    }
  });
});
