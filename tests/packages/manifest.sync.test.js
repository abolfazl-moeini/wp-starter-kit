import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { syncFeaturesToConfig } from "../../packages/create-wp-project/src/manifest.js";
import { defaultFeatures } from "../../packages/create-wp-project/src/features.js";

/**
 * Phase 20.14 / 20.15 — syncFeaturesToConfig(dir, features).
 *
 * The scaffold (Phase 21) writes the same `features` object to
 * BOTH `wpsk-kit.json` AND a `features` key inside
 * `project.config.json`. This helper does the project.config.json
 * half — the manifest half is `writeManifest`.
 *
 * Why both? `wpsk-kit.json` is the durable kit state (kitVersion,
 * distMode, generatedAt, features). `project.config.json` is the
 * project's primary config — every runtime helper (readProjectConfig,
 * the kit's PHP classes, the JS asset bundle) already reads it.
 * Putting `features` in BOTH means:
 *
 *  - A consumer that only knows about project.config.json
 *    (pre-Phase 20 readers) can still answer "which features are
 *    on?" without discovering wpsk-kit.json.
 *  - The kit's own state (wpsk-kit.json) is self-contained —
 *    no need to dereference project.config.json.
 *
 * Two contracts are locked here:
 *  1. project.config.json is updated in place — the v2 fields
 *     are preserved (so consumers that read them keep working).
 *  2. If project.config.json doesn't exist yet, syncFeaturesToConfig
 *     creates a minimal one with the v2 branding defaults + the
 *     `features` key (so the scaffold can call it before the
 *     first write without an existence check).
 */
describe("syncFeaturesToConfig() — project.config.json sync (Phase 20.15)", () => {
  let tmp;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpsk-sync-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  /* -- add / overwrite `features` in an existing config -- */

  test("writes a `features` key to an existing project.config.json", async () => {
    // Pre-populate a v2-valid config (no features).
    const cfg = {
      slug: "my-project",
      globalName: "MyProject",
      localizeVar: "MyProjectLoc",
      textDomain: "my-project",
      hookPrefix: "my-project",
      npmScope: "@my-org",
      depsBundle: "my-project-deps.js",
      phpFunctionPrefix: "myprj_",
      uiFramework: "preact",
      restNamespace: "wpsk/v1",
      vendorPrefix: "WpskVendor",
      phpMinVersion: "7.4",
      phpSourceVersion: "8.1",
      batchEndpoint: "/batch/v1",
    };
    await fs.writeFile(
      path.join(tmp, "project.config.json"),
      JSON.stringify(cfg, null, 2) + "\n",
      "utf8",
    );

    const features = defaultFeatures();
    await syncFeaturesToConfig(tmp, features);

    const after = JSON.parse(
      await fs.readFile(path.join(tmp, "project.config.json"), "utf8"),
    );
    expect(after.features).toBeDefined();
    expect(after.features).toEqual(features);
  });

  test("preserves all v2 fields (no data loss)", async () => {
    // The sync helper must NOT drop, rename, or restructure v2
    // fields — those are the project's branding, and downstream
    // consumers (PHP classes, JS asset bundle, REST router) read
    // them via readProjectConfig.
    const cfg = {
      slug: "my-project",
      globalName: "MyProject",
      localizeVar: "MyProjectLoc",
      textDomain: "my-project",
      hookPrefix: "my-project",
      npmScope: "@my-org",
      depsBundle: "my-project-deps.js",
      phpFunctionPrefix: "myprj_",
      uiFramework: "preact",
      restNamespace: "myns/v2",
      vendorPrefix: "AcmeVendor",
      phpMinVersion: "8.0",
      phpSourceVersion: "8.2",
      batchEndpoint: "/wp/v2/batch",
    };
    await fs.writeFile(
      path.join(tmp, "project.config.json"),
      JSON.stringify(cfg, null, 2) + "\n",
      "utf8",
    );

    await syncFeaturesToConfig(tmp, defaultFeatures());

    const after = JSON.parse(
      await fs.readFile(path.join(tmp, "project.config.json"), "utf8"),
    );
    // Every v2 field must round-trip.
    expect(after.slug).toBe("my-project");
    expect(after.globalName).toBe("MyProject");
    expect(after.localizeVar).toBe("MyProjectLoc");
    expect(after.textDomain).toBe("my-project");
    expect(after.hookPrefix).toBe("my-project");
    expect(after.npmScope).toBe("@my-org");
    expect(after.depsBundle).toBe("my-project-deps.js");
    expect(after.phpFunctionPrefix).toBe("myprj_");
    expect(after.uiFramework).toBe("preact");
    expect(after.restNamespace).toBe("myns/v2");
    expect(after.vendorPrefix).toBe("AcmeVendor");
    expect(after.phpMinVersion).toBe("8.0");
    expect(after.phpSourceVersion).toBe("8.2");
    expect(after.batchEndpoint).toBe("/wp/v2/batch");
    // And the new key is there.
    expect(after.features).toEqual(defaultFeatures());
  });

  test("overwrites an existing `features` key on second call (Phase 22 addFeature path)", async () => {
    const cfg = {
      slug: "my-project",
      globalName: "MyProject",
      localizeVar: "MyProjectLoc",
      textDomain: "my-project",
      hookPrefix: "my-project",
      npmScope: "@my-org",
    };
    await fs.writeFile(
      path.join(tmp, "project.config.json"),
      JSON.stringify(cfg, null, 2) + "\n",
      "utf8",
    );

    // First sync: defaults.
    await syncFeaturesToConfig(tmp, defaultFeatures());
    let after = JSON.parse(
      await fs.readFile(path.join(tmp, "project.config.json"), "utf8"),
    );
    expect(after.features.js).toBe("typescript");

    // Second sync: js flipped to 'none' (e.g. Phase 22 addFeature
    // turning the JS feature off). The config must reflect the
    // new value, not append or merge.
    await syncFeaturesToConfig(tmp, { ...defaultFeatures(), js: "none" });
    after = JSON.parse(
      await fs.readFile(path.join(tmp, "project.config.json"), "utf8"),
    );
    expect(after.features.js).toBe("none");
  });

  test("preserves unknown future keys (forward-compat, mirrors readProjectConfig)", async () => {
    // The sync helper must NOT touch fields it doesn't know about.
    // A consumer's project.config.json may have keys a future kit
    // version added; overwriting the file would silently lose
    // them.
    const cfg = {
      slug: "my-project",
      globalName: "MyProject",
      localizeVar: "MyProjectLoc",
      textDomain: "my-project",
      hookPrefix: "my-project",
      npmScope: "@my-org",
      futureKey: "keep-me",
    };
    await fs.writeFile(
      path.join(tmp, "project.config.json"),
      JSON.stringify(cfg, null, 2) + "\n",
      "utf8",
    );

    await syncFeaturesToConfig(tmp, defaultFeatures());
    const after = JSON.parse(
      await fs.readFile(path.join(tmp, "project.config.json"), "utf8"),
    );
    expect(after.futureKey).toBe("keep-me");
  });

  /* -- bootstrap a new project that has no project.config.json -- */

  test("creates a minimal project.config.json when missing", async () => {
    // The scaffold (Phase 21) calls syncFeaturesToConfig BEFORE
    // the first write of project.config.json — the helper must
    // create a skeleton config with the v2 defaults + the
    // `features` key. The scaffold will then overwrite this file
    // with the real one (it has more keys), but the contract is
    // that syncFeaturesToConfig never throws ENOENT.
    const features = defaultFeatures();
    await syncFeaturesToConfig(tmp, features);

    const after = JSON.parse(
      await fs.readFile(path.join(tmp, "project.config.json"), "utf8"),
    );
    expect(after.features).toEqual(features);
    // The minimal file must include the v2 defaults so a project
    // that never gets scaffolded further (e.g. a hand-edited
    // addFeature path) still has a valid config.
    expect(after.slug).toBeDefined();
    expect(after.globalName).toBeDefined();
    expect(after.textDomain).toBeDefined();
    expect(after.hookPrefix).toBeDefined();
    expect(after.npmScope).toBeDefined();
  });
});
