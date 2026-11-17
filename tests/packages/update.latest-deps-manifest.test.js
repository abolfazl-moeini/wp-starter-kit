/**
 * Regression suite — `wpdev update` target resolution, semver
 * caret parsing, feature-aware dep changes, and manifest
 * preservation during `runMigrations`.
 *
 * Four production bugs this file locks out:
 *
 *  1. The CLI resolved "latest kit version" from the dep
 *     registry's FIRST entry when `_kit` was absent — which
 *     picked `typescript`'s range ("^5.6.0") as the update
 *     target. The registry is NOT a version source; the
 *     latest registered MIGRATION is.
 *
 *  2. `compareSemver` / planUpdate's local parse treated a
 *     "^5.6.0" target as [0, 5, 6] (parseInt("^5") → NaN → 0),
 *     so a default update from 0.0.0 skipped every migration
 *     ≥ 1.0.0. Range-prefix strings ("^", "~", "v") must be
 *     stripped before parsing.
 *
 *  3. `runMigrations` step "apply dep bumps" diffed against the
 *     FULL registry regardless of the project's features — a
 *     `js: "none"` project received the whole JS toolchain
 *     (babel, jest, eslint, preact, …) as `add`. Deps must be
 *     gated by the manifest's features (e2e set on
 *     `e2eTest: "playwright"`, husky set on `husky != "off"`,
 *     the rest of the npm toolchain on `js != "none"`).
 *
 *  4. `runMigrations` rebuilt the manifest via
 *     `buildManifest({ kitVersion, features, distMode })`,
 *     which DROPPED every branding field (`slug`, `globalName`,
 *     `textDomain`, `hookPrefix`, `restNamespace`, …) and any
 *     extra keys (`buildEngine`, `docs`, `build`). The runner
 *     must merge into the post-migration manifest instead.
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  compareSemver,
  selectMigrations,
  getMigrations,
  latestMigrationVersion,
  runMigrations,
} from "../../packages/create-wp-project/src/migrations/index.js";
import { planUpdate } from "../../packages/create-wp-project/src/plan-update.js";
import { doctorProject } from "../../packages/create-wp-project/src/doctor.js";
import { runUpdate } from "../../packages/cli/src/commands/update.js";

/* -------------------------------------------------------------------- */
/* Fixtures                                                              */
/* -------------------------------------------------------------------- */

async function seedProject({
  kitVersion = "0.1.0",
  features = {},
  extraManifest = {},
  packageDeps = {},
  composerDeps = {},
} = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-fix-"));
  const manifest = {
    schema: 2,
    kitVersion,
    distMode: "deps",
    generatedAt: "2026-01-01T00:00:00.000Z",
    features,
    slug: "wpdev-sample",
    globalName: "WpdevSample",
    textDomain: "wpdev-sample",
    hookPrefix: "wpdev-sample",
    restNamespace: "wpdev-sample/v1",
    buildEngine: "go",
    docs: { enabled: true },
    build: { assetMappings: [] },
    ...extraManifest,
  };
  await fs.writeFile(
    path.join(dir, "wpdev.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(dir, "package.json"),
    JSON.stringify(
      {
        name: "@test/sample",
        version: "0.1.0",
        private: true,
        devDependencies: packageDeps,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(dir, "composer.json"),
    JSON.stringify(
      { name: "test/sample", type: "project", "require-dev": composerDeps },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  return dir;
}

/* -------------------------------------------------------------------- */
/* 1. latest-version resolution                                          */
/* -------------------------------------------------------------------- */

describe("latestMigrationVersion() — the update engine's real 'latest'", () => {
  test("equals the highest registered migration version", () => {
    const versions = getMigrations().map((m) => m.version);
    const expected = versions.reduce((a, b) =>
      compareSemver(a, b) > 0 ? a : b,
    );
    expect(latestMigrationVersion()).toBe(expected);
  });

  test("is >= every registered migration version", () => {
    const latest = latestMigrationVersion();
    for (const m of getMigrations()) {
      expect(compareSemver(m.version, latest)).toBeLessThanOrEqual(0);
    }
  });

  test("runUpdate() resolves the default target from the migration registry, not a random dep", async () => {
    let capturedTo;
    const fakeEngine = {
      getDepVersions: () => new Map([["typescript", "^5.6.0"]]),
      latestMigrationVersion: () => latestMigrationVersion(),
      planUpdate: (dir, to) => {
        capturedTo = to;
        return {
          ok: true,
          from: "0.1.0",
          to,
          migrations: [],
          depChanges: {
            package: { add: {}, remove: {}, bump: {} },
            composer: { add: {}, remove: {}, bump: {} },
          },
        };
      },
    };
    const res = await runUpdate("/tmp/does-not-exist-for-plan", {
      engine: fakeEngine,
    });
    expect(res.ok).toBe(true);
    expect(capturedTo).toBe(latestMigrationVersion());
    expect(capturedTo).not.toMatch(/^\^/); // not a dep range
  });

  test("runUpdate() still honours an explicit _kit registry entry when present", async () => {
    let capturedTo;
    const fakeEngine = {
      getDepVersions: () =>
        new Map([
          ["_kit", "9.9.9"],
          ["typescript", "^5.6.0"],
        ]),
      latestMigrationVersion: () => latestMigrationVersion(),
      planUpdate: (dir, to) => {
        capturedTo = to;
        return {
          ok: true,
          from: "0.1.0",
          to,
          migrations: [],
          depChanges: {
            package: { add: {}, remove: {}, bump: {} },
            composer: { add: {}, remove: {}, bump: {} },
          },
        };
      },
    };
    await runUpdate("/tmp/does-not-exist-for-plan", { engine: fakeEngine });
    expect(capturedTo).toBe("9.9.9");
  });
});

/* -------------------------------------------------------------------- */
/* 2. semver prefix tolerance                                            */
/* -------------------------------------------------------------------- */

describe("compareSemver() — range-prefix tolerance", () => {
  test.each([
    ["^2.6.0", "1.1.0", 1],
    ["~1.2.0", "1.2.0", 0],
    ["v1.0.0", "0.9.0", 1],
    ["1.0.0", "^0.9.0", 1],
    ["^5.6.0", "0.2.0", 1],
  ])("compareSemver(%j, %j) > / = 0 correctly", (a, b, expectedSign) => {
    const result = compareSemver(a, b);
    expect(Math.sign(result)).toBe(expectedSign);
  });

  test("selectMigrations('0.0.0', '^2.6.0') includes migrations ≥ 1.0.0", () => {
    const versions = selectMigrations("0.0.0", "^2.6.0").map((m) => m.version);
    expect(versions).toContain("1.0.0");
    expect(versions[versions.length - 1]).toBe("2.6.0");
    expect(versions).toEqual(
      getMigrations()
        .filter((m) => compareSemver("0.0.0", m.version) < 0)
        .map((m) => m.version),
    );
  });

  test("planUpdate() with a caret target selects the full chain from 0.0.0", async () => {
    const dir = await seedProject({ kitVersion: "0.0.0" });
    try {
      const plan = planUpdate(dir, "^2.6.0");
      expect(plan.ok).toBe(true);
      const versions = plan.migrations.map((m) => m.version);
      expect(versions).toContain("1.0.0");
      expect(versions).toContain("2.2.0");
      expect(versions[versions.length - 1]).toBe("2.6.0");
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});

/* -------------------------------------------------------------------- */
/* 3. feature-aware dep changes                                          */
/* -------------------------------------------------------------------- */

describe("planUpdate() depChanges — feature-gated registry", () => {
  test("js:none + e2eTest:playwright adds only the e2e npm set", async () => {
    const dir = await seedProject({
      kitVersion: "0.1.0",
      features: {
        js: "none",
        jsLib: "none",
        jsTest: "none",
        e2eTest: "playwright",
        husky: "off",
      },
      packageDeps: {},
    });
    try {
      const plan = planUpdate(dir, "0.2.0");
      const add = plan.depChanges.package.add;
      expect(add["@playwright/test"]).toBeDefined();
      expect(add["@wordpress/e2e-test-utils-playwright"]).toBeDefined();
      // The JS toolchain must NOT be added to a js:none project.
      expect(add["typescript"]).toBeUndefined();
      expect(add["jest"]).toBeUndefined();
      expect(add["esbuild"]).toBeUndefined();
      expect(add["preact"]).toBeUndefined();
      expect(add["eslint"]).toBeUndefined();
      expect(add["@wpdev/build"]).toBeUndefined();
      // husky off → husky toolchain skipped
      expect(add["husky"]).toBeUndefined();
      // composer side stays registry-driven (PHP toolchain is universal)
      expect(plan.depChanges.composer.add["rector/rector"]).toBeDefined();
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  test("e2eTest:none drops the e2e npm set", async () => {
    const dir = await seedProject({
      kitVersion: "0.1.0",
      features: { js: "esbuild", e2eTest: "none", husky: "off" },
      packageDeps: {},
    });
    try {
      const plan = planUpdate(dir, "0.2.0");
      const add = plan.depChanges.package.add;
      expect(add["@playwright/test"]).toBeUndefined();
      expect(add["typescript"]).toBeDefined();
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  test("a features-less manifest keeps the unfiltered registry (back-compat)", async () => {
    const dir = await seedProject({
      kitVersion: "0.1.0",
      features: {},
      packageDeps: {},
    });
    try {
      const plan = planUpdate(dir, "0.2.0");
      expect(plan.depChanges.package.add["typescript"]).toBeDefined();
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  test("runMigrations() applies the same feature gate when writing package.json", async () => {
    const dir = await seedProject({
      kitVersion: "0.1.0",
      features: {
        js: "none",
        jsLib: "none",
        jsTest: "none",
        e2eTest: "playwright",
        husky: "off",
      },
      packageDeps: {},
      composerDeps: {},
    });
    try {
      const res = await runMigrations(dir, { from: "0.1.0", to: "0.2.0" });
      expect(res.ok).toBe(true);
      const pkg = JSON.parse(
        await fs.readFile(path.join(dir, "package.json"), "utf8"),
      );
      const devDeps = pkg.devDependencies || {};
      expect(devDeps["@playwright/test"]).toBeDefined();
      expect(devDeps["typescript"]).toBeUndefined();
      expect(devDeps["jest"]).toBeUndefined();
      expect(devDeps["husky"]).toBeUndefined();
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});

/* -------------------------------------------------------------------- */
/* 4. manifest preservation                                              */
/* -------------------------------------------------------------------- */

describe("runMigrations() — manifest merge preserves branding and extra keys", () => {
  test("branding fields, buildEngine, docs and build survive a full run", async () => {
    const dir = await seedProject({ kitVersion: "0.1.0" });
    try {
      const res = await runMigrations(dir, { from: "0.1.0", to: "0.2.0" });
      expect(res.ok).toBe(true);
      const after = JSON.parse(
        await fs.readFile(path.join(dir, "wpdev.json"), "utf8"),
      );
      expect(after.kitVersion).toBe("0.2.0");
      expect(after.slug).toBe("wpdev-sample");
      expect(after.globalName).toBe("WpdevSample");
      expect(after.textDomain).toBe("wpdev-sample");
      expect(after.hookPrefix).toBe("wpdev-sample");
      expect(after.restNamespace).toBe("wpdev-sample/v1");
      expect(after.buildEngine).toBe("go");
      expect(after.docs).toEqual({ enabled: true });
      expect(after.build).toEqual({ assetMappings: [] });
      expect(after.previousKitVersion).toBe("0.1.0");
      expect(typeof after.migratedAt).toBe("string");
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});

/* -------------------------------------------------------------------- */
/* doctor — version-coherence warning                                    */
/* -------------------------------------------------------------------- */

describe("doctorProject() — kitVersion at/above the migration chain is current", () => {
  test("project at latestMigrationVersion reports no stale-kit warning", async () => {
    const dir = await seedProject({ kitVersion: latestMigrationVersion() });
    try {
      const result = doctorProject(dir);
      const stale = result.warnings.find((w) =>
        w.includes("newer than the installed kit"),
      );
      expect(stale).toBeUndefined();
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
