/**
 * Phase 25 — faultTolerance:on scaffold wiring.
 *
 * Vendors packages/php-fault-tolerance with Composer path-repo
 * symlink:false (Docker-safe; no host-absolute kit symlinks).
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { scaffoldProject } from "../../packages/create-wp-project/src/index.js";
import { run as faultToleranceRun } from "../../packages/create-wp-project/src/generators/faultTolerance.js";
import { defaultFeatures } from "../../packages/create-wp-project/src/features.js";
import { addFeature } from "../../packages/create-wp-project/src/addFeature.js";
import {
  buildManifest,
  writeManifest,
} from "../../packages/create-wp-project/src/manifest.js";

const goodAnswers = {
  slug: "my-project",
  npmScope: "myorg",
  globalName: "MyProject",
  localizeVar: "MyProjectLoc",
  textDomain: "my-project",
  hookPrefix: "my-project",
  depsBundle: "my-project-deps.js",
  phpFunctionPrefix: "myprj_",
  uiFramework: "preact",
};

function makeCtx(features = {}) {
  return {
    answers: goodAnswers,
    cfg: {
      slug: goodAnswers.slug,
      globalName: goodAnswers.globalName,
      vendorPrefix: "WpdevVendor",
    },
    features: {
      ...defaultFeatures(),
      faultTolerance: "on",
      phpMinVersion: "8.1",
      ...features,
    },
    vars: {
      ...goodAnswers,
    },
  };
}

describe("faultTolerance generator (Phase 25)", () => {
  test("emits docs + packages/php-fault-tolerance when faultTolerance=on", () => {
    const out = faultToleranceRun(makeCtx());
    expect(out.files["docs/fault-tolerance.md"]).toBeDefined();
    expect(
      out.files["packages/php-fault-tolerance/composer.json"],
    ).toBeDefined();
    expect(
      out.files["packages/php-fault-tolerance/src/bootstrap.php"],
    ).toBeDefined();
    expect(out.composerPatches.require["wpdev/php-fault-tolerance"]).toBe("*");
    expect(out.composerPatches.repositories).toEqual([
      {
        type: "path",
        url: "packages/*",
        options: { monorepo: true, symlink: false },
      },
    ]);
  });

  test("emits nothing when faultTolerance=off", () => {
    const out = faultToleranceRun(makeCtx({ faultTolerance: "off" }));
    expect(Object.keys(out.files)).toEqual([]);
  });
});

describe("faultTolerance scaffold integration", () => {
  let tmp;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-ft-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("scaffold with faultTolerance:on vendors packages/php-fault-tolerance", async () => {
    const res = await scaffoldProject(tmp, goodAnswers, {
      features: {
        ...defaultFeatures(),
        faultTolerance: "on",
        phpMinVersion: "8.1",
      },
    });
    expect(res.ok).toBe(true);
    const composer = JSON.parse(
      await fs.readFile(path.join(tmp, "composer.json"), "utf8"),
    );
    expect(composer.require["wpdev/php-fault-tolerance"]).toBe("*");
    const pathRepo = (composer.repositories || []).find(
      (r) => r.type === "path" && r.url === "packages/*",
    );
    expect(pathRepo).toBeDefined();
    expect(pathRepo.options.symlink).toBe(false);
    // No host-absolute kit path repo (breaks Docker).
    const absRepo = (composer.repositories || []).find(
      (r) =>
        typeof r.url === "string" &&
        (r.url.startsWith("/") || r.url.includes("extend-kit")),
    );
    expect(absRepo).toBeUndefined();
    await expect(
      fs.access(
        path.join(tmp, "packages/php-fault-tolerance/src/bootstrap.php"),
      ),
    ).resolves.toBeUndefined();
  });
});

describe("addFeature faultTolerance happy path", () => {
  let tmp;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-ft-add-"));
    const features = {
      ...defaultFeatures(),
      faultTolerance: "off",
      phpMinVersion: "8.1",
    };
    await fs.writeFile(
      path.join(tmp, "wpdev.json"),
      JSON.stringify(
        {
          slug: "my-project",
          globalName: "MyProject",
          features,
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(tmp, "composer.json"),
      JSON.stringify(
        {
          require: { php: ">=8.1" },
          repositories: [],
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    await writeManifest(
      tmp,
      buildManifest({
        kitVersion: "0.1.0",
        features,
        generatedAt: "2026-06-16T00:00:00.000Z",
      }),
    );
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("addFeature(dir, faultTolerance, on) vendors package + patches composer", async () => {
    const res = await addFeature(tmp, "faultTolerance", "on");
    expect(res.ok).toBe(true);
    const composer = JSON.parse(
      await fs.readFile(path.join(tmp, "composer.json"), "utf8"),
    );
    expect(composer.require["wpdev/php-fault-tolerance"]).toBe("*");
    expect(res.written).toContain("docs/fault-tolerance.md");
    expect(
      res.written.some((p) =>
        String(p).startsWith("packages/php-fault-tolerance/"),
      ),
    ).toBe(true);
    await expect(
      fs.access(
        path.join(tmp, "packages/php-fault-tolerance/src/bootstrap.php"),
      ),
    ).resolves.toBeUndefined();
  });
});
