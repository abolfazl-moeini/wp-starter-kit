/**
 * Phase 22.7 / 22.8 — addFeature() variant switch.
 *
 * When the user calls `addFeature(dir, 'js', 'flow')` while the
 * project is currently on `js: typescript`, the engine must:
 *
 *  1. Delete the OLD variant's owned files that are NOT also
 *     owned by the NEW variant. Files shared between the two
 *     variants are kept (and overwritten by the new variant's
 *     output if the new variant writes to them).
 *  2. Write the NEW variant's owned files.
 *  3. Update the manifest to the new variant.
 *  4. Never touch files outside the new variant's `owns` (e.g.
 *     `tsconfig.json` is core-owned, NOT touched by a js:* swap).
 *
 * The delete-set is computed as:
 *   delete = (files matching OLD owns) − (files matching NEW owns)
 *
 * Where "matching" uses minimatch glob. The test asserts the
 * delete-set is correct for a typescript→flow switch.
 *
 * Shared paths between variants of the same feature (e.g.
 * `js:pure` and `js:flow` both own `assets/dependencies.js`)
 * are NOT deleted by the switch — only files exclusively
 * owned by the OLD variant. This keeps the delete-set
 * minimal and prevents accidental data loss for any user
 * edits in the shared path.
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { addFeature } from "../../packages/create-wp-project/src/addFeature.js";
import { defaultFeatures } from "../../packages/create-wp-project/src/features.js";
import {
  buildManifest,
  writeManifest,
} from "../../packages/create-wp-project/src/manifest.js";

async function seedProject(tmp, { features = defaultFeatures() } = {}) {
  const cfg = {
    slug: "my-project",
    globalName: "MyProject",
    localizeVar: "MyProjectLoc",
    textDomain: "my-project",
    hookPrefix: "my-project",
    npmScope: "@myorg",
    depsBundle: "my-project-deps.js",
    phpFunctionPrefix: "myprj_",
    uiFramework: "preact",
    projectType: "plugin",
    restNamespace: "wpdev/v1",
    vendorPrefix: "WpdevVendor",
    phpMinVersion: "7.4",
    phpSourceVersion: "8.1",
    batchEndpoint: "/batch/v1",
  };
  await fs.writeFile(
    path.join(tmp, "wpdev.json"),
    JSON.stringify({ ...cfg, features: { ...features } }, null, 2) + "\n",
    "utf8",
  );
  await writeManifest(
    tmp,
    buildManifest({
      kitVersion: "0.1.0",
      features,
      generatedAt: "2026-06-15T00:00:00.000Z",
    }),
  );
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

describe("addFeature() — variant switch (Phase 22.7, 22.8)", () => {
  let tmp;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-switch-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("switching js:typescript → js:flow deletes the OLD variant's files that are not in the new", async () => {
    // Pre-populate the project with js:typescript ON. We need
    // the actual file from the typescript variant on disk so the
    // engine sees a real delete target.
    await seedProject(tmp, {
      features: { ...defaultFeatures(), js: "typescript" },
    });
    // Write the typescript variant's files manually.
    await fs.mkdir(path.join(tmp, "assets"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "assets", "dependencies.ts"),
      "// old typescript variant body\n",
      "utf8",
    );
    // core-owned tsconfig.json (must NOT be touched by the switch)
    await fs.writeFile(path.join(tmp, "tsconfig.json"), "{}\n", "utf8");

    const res = await addFeature(tmp, "js", "flow");
    expect(res.ok).toBe(true);

    // The old variant's `assets/dependencies.ts` must be DELETED
    // (the new variant doesn't own it).
    expect(await fileExists(path.join(tmp, "assets/dependencies.ts"))).toBe(
      false,
    );
    // The new variant's `assets/dependencies.js` must be WRITTEN.
    expect(await fileExists(path.join(tmp, "assets/dependencies.js"))).toBe(
      true,
    );
    // The new variant's `.flowconfig` must be WRITTEN.
    expect(await fileExists(path.join(tmp, ".flowconfig"))).toBe(true);
    // tsconfig.json is core-owned — must NOT be deleted or
    // modified by a js:* variant switch.
    expect(await fileExists(path.join(tmp, "tsconfig.json"))).toBe(true);
  });

  test("variant switch updates wpdev.json features.js to the new variant", async () => {
    await seedProject(tmp, {
      features: { ...defaultFeatures(), js: "typescript" },
    });
    await fs.mkdir(path.join(tmp, "assets"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "assets", "dependencies.ts"),
      "// typescript\n",
      "utf8",
    );

    const res = await addFeature(tmp, "js", "flow");
    expect(res.ok).toBe(true);
    const manifest = JSON.parse(
      await fs.readFile(path.join(tmp, "wpdev.json"), "utf8"),
    );
    expect(manifest.features.js).toBe("flow");
  });

  test("variant switch updates wpdev.json features.js to the new variant", async () => {
    await seedProject(tmp, {
      features: { ...defaultFeatures(), js: "typescript" },
    });
    await fs.mkdir(path.join(tmp, "assets"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "assets", "dependencies.ts"),
      "// typescript\n",
      "utf8",
    );

    const res = await addFeature(tmp, "js", "flow");
    expect(res.ok).toBe(true);
    const cfg = JSON.parse(
      await fs.readFile(path.join(tmp, "wpdev.json"), "utf8"),
    );
    expect(cfg.features.js).toBe("flow");
  });

  test("switching js:flow → js:typescript deletes the flow-only files", async () => {
    // Pre-populate: js:flow with .flowconfig + assets/dependencies.js.
    await seedProject(tmp, {
      features: { ...defaultFeatures(), js: "flow" },
    });
    await fs.mkdir(path.join(tmp, "assets"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "assets", "dependencies.js"),
      "// old flow variant\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(tmp, ".flowconfig"),
      "[ignore]\n.*/node_modules/.*\n",
      "utf8",
    );

    const res = await addFeature(tmp, "js", "typescript");
    expect(res.ok).toBe(true);

    // .flowconfig is flow-only — must be deleted.
    expect(await fileExists(path.join(tmp, ".flowconfig"))).toBe(false);
    // assets/dependencies.js — both flow AND typescript-implied
    // do NOT claim it (only flow and pure claim it). So the
    // typescript variant doesn't claim it. It was previously
    // owned by flow; new variant (typescript) doesn't own it.
    // Per the delete rule (old owns, new doesn't), the file
    // gets deleted. The new variant writes assets/dependencies.ts.
    expect(await fileExists(path.join(tmp, "assets/dependencies.js"))).toBe(
      false,
    );
    // typescript variant's file is written.
    expect(await fileExists(path.join(tmp, "assets/dependencies.ts"))).toBe(
      true,
    );
  });

  test("variant switch preserves v2 fields in wpdev.json", async () => {
    await seedProject(tmp, {
      features: { ...defaultFeatures(), js: "typescript" },
    });
    await fs.mkdir(path.join(tmp, "assets"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "assets", "dependencies.ts"),
      "// ts\n",
      "utf8",
    );

    await addFeature(tmp, "js", "flow");
    const cfg = JSON.parse(
      await fs.readFile(path.join(tmp, "wpdev.json"), "utf8"),
    );
    expect(cfg.slug).toBe("my-project");
    expect(cfg.globalName).toBe("MyProject");
    expect(cfg.textDomain).toBe("my-project");
  });

  test("switching to the same variant is a no-op (idempotency still applies)", async () => {
    await seedProject(tmp, {
      features: { ...defaultFeatures(), js: "typescript" },
    });
    await fs.mkdir(path.join(tmp, "assets"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "assets", "dependencies.ts"),
      "// current\n",
      "utf8",
    );

    const res = await addFeature(tmp, "js", "typescript");
    expect(res.ok).toBe(true);
    expect(res.noop).toBe(true);
    // File is unchanged.
    const body = await fs.readFile(
      path.join(tmp, "assets", "dependencies.ts"),
      "utf8",
    );
    expect(body).toBe("// current\n");
  });

  test("variant switch does NOT touch user code outside the new variant's owns (e.g. core-owned tsconfig.json)", async () => {
    // Seed with a hand-edited tsconfig.json (core-owned) and the
    // typescript variant's body. After a switch to flow, the
    // hand-edited tsconfig.json must be unchanged.
    await seedProject(tmp, {
      features: { ...defaultFeatures(), js: "typescript" },
    });
    await fs.mkdir(path.join(tmp, "assets"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "assets", "dependencies.ts"),
      "// ts\n",
      "utf8",
    );
    const userTsconfig = '{\n  "compilerOptions": { "strict": false }\n}\n';
    await fs.writeFile(path.join(tmp, "tsconfig.json"), userTsconfig, "utf8");

    await addFeature(tmp, "js", "flow");
    const after = await fs.readFile(path.join(tmp, "tsconfig.json"), "utf8");
    expect(after).toBe(userTsconfig);
  });
});
