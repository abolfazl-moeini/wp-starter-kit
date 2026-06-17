/**
 * Phase 25 — faultTolerance:on scaffold wiring.
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
      faultTolerancePath: "../packages/php-fault-tolerance",
    },
  };
}

describe("faultTolerance generator (Phase 25)", () => {
  test("emits docs/fault-tolerance.md when faultTolerance=on", () => {
    const out = faultToleranceRun(makeCtx());
    expect(out.files["docs/fault-tolerance.md"]).toBeDefined();
    expect(out.composerPatches.require["wpdev/php-fault-tolerance"]).toBe("*");
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

  test("scaffold with faultTolerance:on + phpMinVersion:8.1 requires wpdev/php-fault-tolerance", async () => {
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
    const repo = (composer.repositories || []).find(
      (r) => typeof r.url === "string" && r.url.includes("php-fault-tolerance"),
    );
    expect(repo).toBeDefined();
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
      path.join(tmp, "project.config.json"),
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
          require: { php: ">=8.1", "wpdev/framework": "*" },
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

  test("addFeature(dir, faultTolerance, on) patches composer.json", async () => {
    const res = await addFeature(tmp, "faultTolerance", "on");
    expect(res.ok).toBe(true);
    const composer = JSON.parse(
      await fs.readFile(path.join(tmp, "composer.json"), "utf8"),
    );
    expect(composer.require["wpdev/php-fault-tolerance"]).toBe("*");
    expect(res.written).toContain("docs/fault-tolerance.md");
  });
});
