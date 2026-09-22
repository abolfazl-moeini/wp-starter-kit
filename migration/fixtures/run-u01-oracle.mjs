#!/usr/bin/env node
/**
 * Source-language U01 oracle. Runs the real readProjectConfig.js
 * against frozen cases. Must stay green on SHA 8c1e9ba (and later
 * approved snapshots). Invoked from migration receipts, not Jest.
 */
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { readProjectConfig } from "../../core/packages/utils/readProjectConfig.js";

const dir = mkdtempSync(path.join(os.tmpdir(), "u01-oracle-"));
const write = (name, value) => {
  const file = path.join(dir, name);
  writeFileSync(
    file,
    typeof value === "string" ? value : JSON.stringify(value),
    "utf8",
  );
  return file;
};

const minimal = {
  slug: "test",
  globalName: "Test",
  localizeVar: "TestLoc",
  textDomain: "test",
  hookPrefix: "test",
  npmScope: "@test",
};

try {
  const valid = readProjectConfig({
    path: write("valid.json", {
      slug: "my-project",
      globalName: "MyProject",
      localizeVar: "MyProjectLoc",
      textDomain: "my-project",
      hookPrefix: "my-project",
      npmScope: "@my-org",
    }),
  });
  assert.equal(valid.slug, "my-project");
  assert.equal(valid.uiFramework, "preact");
  assert.equal(valid.depsBundle, "my-project-deps.js");
  assert.equal(valid.vendorPrefix, "WpdevVendor");

  assert.throws(
    () =>
      readProjectConfig({
        path: write("empty-slug.json", { ...minimal, slug: "" }),
      }),
    /missing required fields: slug/,
  );

  const nullVendor = readProjectConfig({
    path: write("null-vendor.json", { ...minimal, vendorPrefix: null }),
  });
  assert.equal(nullVendor.vendorPrefix, null);

  const unicode = readProjectConfig({
    path: write("unicode.json", {
      ...minimal,
      slug: "افزونه",
      globalName: "افزونه",
      textDomain: "افزونه",
      hookPrefix: "افزونه",
    }),
  });
  assert.equal(unicode.slug, "افزونه");
  assert.equal(unicode.depsBundle, "افزونه-deps.js");

  assert.throws(
    () => readProjectConfig({ path: write("array.json", [1, 2]) }),
    /missing required fields/,
  );

  assert.throws(
    () => readProjectConfig({ path: write("null.json", "null") }),
    /must contain a JSON object/,
  );

  assert.throws(
    () => readProjectConfig({ path: write("bad.json", "{ bad }") }),
    /malformed or invalid JSON/,
  );

  assert.throws(
    () => readProjectConfig({ path: path.join(dir, "missing.json") }),
    /not found/,
  );

  const a = readProjectConfig({
    path: write("a.json", { ...minimal, slug: "alpha" }),
  });
  const b = readProjectConfig({
    path: write("b.json", { ...minimal, slug: "beta" }),
  });
  assert.equal(a.slug, "alpha");
  assert.equal(b.slug, "beta");
  assert.equal(a.depsBundle, "alpha-deps.js");
  assert.equal(b.depsBundle, "beta-deps.js");

  assert.throws(
    () =>
      readProjectConfig({
        path: write("null-ui.json", { ...minimal, uiFramework: null }),
      }),
    /uiFramework must be "preact" or "react"/,
  );

  assert.throws(
    () =>
      readProjectConfig({
        path: write("vue.json", { ...minimal, uiFramework: "vue" }),
      }),
    /uiFramework must be "preact" or "react"/,
  );

  const extras = readProjectConfig({
    path: write("extras.json", {
      ...minimal,
      features: { js: "typescript" },
      experimentalFlag: true,
    }),
  });
  assert.equal(extras.features.js, "typescript");
  assert.equal(extras.experimentalFlag, true);

  assert.throws(
    () =>
      readProjectConfig({
        path: write("bad-vendor.json", { ...minimal, vendorPrefix: "1Bad" }),
      }),
    /vendorPrefix/,
  );

  // §1.3: non-string identity fields keep raw values; null overwrites defaults.
  const numGlobal = readProjectConfig({
    path: write("num-global.json", { ...minimal, globalName: 1 }),
  });
  assert.equal(numGlobal.globalName, 1);
  const nullPrefix = readProjectConfig({
    path: write("null-prefix.json", { ...minimal, phpFunctionPrefix: null }),
  });
  assert.equal(nullPrefix.phpFunctionPrefix, null);
  const nullDeps = readProjectConfig({
    path: write("null-deps.json", { ...minimal, depsBundle: null }),
  });
  assert.equal(nullDeps.depsBundle, null);

  // §1.9: numeric unknown fields keep JS-lossy spelling through stringify.
  const numExtra = readProjectConfig({
    path: write("num-extra.json", { ...minimal, features: { limit: 9007199254740993 } }),
  });
  assert.equal(numExtra.features.limit, 9007199254740992);
  assert.ok(JSON.stringify(numExtra).includes("9007199254740992"));

  console.log("U01 oracle PASS");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
