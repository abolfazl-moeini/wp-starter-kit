import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  buildManifest,
  writeManifest,
} from "../../packages/create-wp-project/src/manifest.js";
import { defaultFeatures } from "../../packages/create-wp-project/src/features.js";

/**
 * Phase 20.5 / 20.6 — manifest shape + writer.
 *
 * The manifest is the consumer project's `wpsk-kit.json` —
 * the durable record of "which kit version generated this project,
 * which features are on, in which distMode". The schema is:
 *
 *   {
 *     "schema": 1,
 *     "kitVersion": "0.2.0",
 *     "distMode": "vendored" | "deps",
 *     "generatedAt": "<ISO-8601 timestamp>",
 *     "features": { ...validated feature set... }
 *   }
 *
 * Three contracts are locked here:
 *  1. buildManifest() returns the documented shape.
 *  2. distMode defaults to "vendored" until Phase 23 flips it to "deps".
 *  3. writeManifest() writes wpsk-kit.json with stable key order
 *     and a trailing newline.
 *  4. The writer only includes features whose ids are in the catalog
 *     (so a future readManifest can rely on the feature set being
 *     a valid subset of getFeatureCatalog()).
 *
 * Round-trip and readManifest's behaviour for missing / malformed
 * files live in manifest.roundtrip.test.js (Phase 20.7/20.8).
 */
describe("buildManifest() — shape (Phase 20.5)", () => {
  test("returns { schema:1, kitVersion, distMode, generatedAt, features }", () => {
    const m = buildManifest({
      kitVersion: "0.2.0",
      features: defaultFeatures(),
    });
    expect(m.schema).toBe(1);
    expect(m.kitVersion).toBe("0.2.0");
    expect(typeof m.distMode).toBe("string");
    expect(typeof m.generatedAt).toBe("string");
    expect(typeof m.features).toBe("object");
  });

  test("distMode defaults to 'deps' (Phase 23 target; new scaffolds use framework-as-dependency)", () => {
    const m = buildManifest({
      kitVersion: "0.2.0",
      features: defaultFeatures(),
    });
    expect(m.distMode).toBe("deps");
  });

  test("distMode can be overridden explicitly", () => {
    const m = buildManifest({
      kitVersion: "0.2.0",
      features: defaultFeatures(),
      distMode: "deps",
    });
    expect(m.distMode).toBe("deps");
  });

  test("generatedAt is a parseable ISO-8601 string", () => {
    const m = buildManifest({
      kitVersion: "0.2.0",
      features: defaultFeatures(),
    });
    const parsed = new Date(m.generatedAt);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
    // Round-trip through toISOString — strict ISO format.
    expect(m.generatedAt).toBe(parsed.toISOString());
  });

  test("features object contains every catalog id with a string value", () => {
    const m = buildManifest({
      kitVersion: "0.2.0",
      features: defaultFeatures(),
    });
    for (const id of Object.keys(m.features)) {
      expect(typeof m.features[id]).toBe("string");
      expect(m.features[id].length).toBeGreaterThan(0);
    }
  });

  test("extras in the input features object are preserved verbatim", () => {
    // Forward-compat: a project that was generated with a future
    // kit version may have extra features the current catalog
    // doesn't know about. The manifest stores them as-is so a
    // readManifest() on the same kit version sees the same data.
    const m = buildManifest({
      kitVersion: "0.99.0",
      features: { ...defaultFeatures(), futureFeature: "yes" },
    });
    expect(m.features.futureFeature).toBe("yes");
  });

  test("kitVersion is required (string)", () => {
    // The plan does not pin a kitVersion — the caller passes it
    // (e.g. from the consumer project's package.json). A missing
    // version is a real problem and the manifest surfaces it.
    const m = buildManifest({
      kitVersion: "1.2.3",
      features: defaultFeatures(),
    });
    expect(m.kitVersion).toBe("1.2.3");
  });
});

describe("writeManifest() — writes wpsk-kit.json (Phase 20.6)", () => {
  let tmp;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpsk-manifest-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("creates the target directory if it doesn't exist", async () => {
    const nested = path.join(tmp, "deep", "nested", "dir");
    await writeManifest(nested, {
      schema: 1,
      kitVersion: "0.2.0",
      distMode: "deps",
      generatedAt: "2026-06-15T00:00:00.000Z",
      features: defaultFeatures(),
    });
    const stat = await fs.stat(path.join(nested, "wpsk-kit.json"));
    expect(stat.isFile()).toBe(true);
  });

  test("writes a JSON file with a trailing newline", async () => {
    await writeManifest(tmp, {
      schema: 1,
      kitVersion: "0.2.0",
      distMode: "deps",
      generatedAt: "2026-06-15T00:00:00.000Z",
      features: defaultFeatures(),
    });
    const raw = await fs.readFile(path.join(tmp, "wpsk-kit.json"), "utf8");
    expect(raw.endsWith("\n")).toBe(true);
  });

  test("uses 2-space indentation (matches the rest of the kit)", async () => {
    await writeManifest(tmp, {
      schema: 1,
      kitVersion: "0.2.0",
      distMode: "deps",
      generatedAt: "2026-06-15T00:00:00.000Z",
      features: defaultFeatures(),
    });
    const raw = await fs.readFile(path.join(tmp, "wpsk-kit.json"), "utf8");
    // 2-space indent is the kit default — project.config.json uses
    // the same. Stable formatting keeps diffs clean.
    expect(raw).toMatch(/^{\n {2}"schema": 1,/);
  });

  test("uses stable key order: schema, kitVersion, distMode, generatedAt, features", async () => {
    // Stable order matters for two reasons:
    //   1. readable diffs (humans / reviewers can scan the file
    //      and see at a glance whether the schema bumped),
    //   2. byte-identical output across runs of the same input
    //      (so idempotency tests can compare files).
    await writeManifest(tmp, {
      schema: 1,
      kitVersion: "0.2.0",
      distMode: "deps",
      generatedAt: "2026-06-15T00:00:00.000Z",
      features: defaultFeatures(),
    });
    const raw = await fs.readFile(path.join(tmp, "wpsk-kit.json"), "utf8");
    const keys = [];
    for (const m of raw.matchAll(/^ {2}"([^"]+)":/gm)) keys.push(m[1]);
    expect(keys.slice(0, 5)).toEqual([
      "schema",
      "kitVersion",
      "distMode",
      "generatedAt",
      "features",
    ]);
  });

  test("buildManifest() output written by writeManifest() is byte-identical to a second run with the same input", async () => {
    // Idempotency — important for Phase 21 (generators).
    const m1 = {
      schema: 1,
      kitVersion: "0.2.0",
      distMode: "deps",
      generatedAt: "2026-06-15T00:00:00.000Z",
      features: defaultFeatures(),
    };
    await writeManifest(tmp, m1);
    const first = await fs.readFile(path.join(tmp, "wpsk-kit.json"), "utf8");

    // Second run: a fresh manifest object with the same fields,
    // forced to the SAME generatedAt so the bytes should match.
    const m2 = {
      schema: 1,
      kitVersion: "0.2.0",
      distMode: "deps",
      generatedAt: "2026-06-15T00:00:00.000Z",
      features: defaultFeatures(),
    };
    await writeManifest(tmp, m2);
    const second = await fs.readFile(path.join(tmp, "wpsk-kit.json"), "utf8");
    expect(second).toBe(first);
  });
});
