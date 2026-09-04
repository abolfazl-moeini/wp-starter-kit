import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const script = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../artifact-prefix-inventory.mjs",
);

test("discovers all scoped metadata-bearing consumers but excludes standalone wpdev", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-prefix-inventory-"));
  try {
    for (const name of ["wpdev", "wpdev-alpha", "drm-beta", "tavangary-theme", "woocommerce"]) {
      await mkdir(path.join(root, "plugins", name), { recursive: true });
    }
    for (const name of ["wpdev-alpha", "drm-beta", "tavangary-theme"]) {
      await writeFile(path.join(root, "plugins", name, "wpdev.json"), JSON.stringify({ slug: name, vendorPrefix: "SharedVendor" }));
      await writeFile(path.join(root, "plugins", name, "composer.json"), JSON.stringify({ extra: { strauss: { namespace_prefix: "SharedVendor" } } }));
    }
    await writeFile(path.join(root, "plugins/wpdev/wpdev.json"), "{}");
    await writeFile(path.join(root, "plugins/wpdev/composer.json"), "{}");

    await execFileAsync(process.execPath, [script, root]);
    const report = JSON.parse(await readFile(path.join(root, "artifact-prefix-inventory.json"), "utf8"));
    assert.deepEqual(report.artifacts.map((artifact) => artifact.consumer), [
      "drm-beta",
      "tavangary-theme",
      "wpdev-alpha",
    ]);
    assert.deepEqual(report.collisions.SharedVendor, ["drm-beta", "tavangary-theme", "wpdev-alpha"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects symlinked consumer metadata instead of following it into inventory evidence", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-prefix-inventory-symlink-"));
  try {
    const pluginRoot = path.join(root, "plugins", "wpdev-alpha");
    const externalMetadata = path.join(root, "external-wpdev.json");
    await mkdir(pluginRoot, { recursive: true });
    await writeFile(externalMetadata, JSON.stringify({ slug: "wpdev-alpha", vendorPrefix: "AlphaVendor" }));
    await symlink(externalMetadata, path.join(pluginRoot, "wpdev.json"));
    await writeFile(path.join(pluginRoot, "composer.json"), JSON.stringify({ extra: { strauss: { namespace_prefix: "AlphaVendor" } } }));

    await assert.rejects(
      execFileAsync(process.execPath, [script, root]),
      (error) => {
        assert.match(error.stderr, /wpdev-alpha\/wpdev\.json: must be a regular non-symlink file/);
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects an in-scope consumer directory symlink instead of silently omitting it", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-prefix-inventory-consumer-symlink-"));
  try {
    const externalPlugin = path.join(root, "external-plugin");
    await mkdir(externalPlugin, { recursive: true });
    await writeFile(path.join(externalPlugin, "wpdev.json"), JSON.stringify({ slug: "wpdev-alpha", vendorPrefix: "AlphaVendor" }));
    await writeFile(path.join(externalPlugin, "composer.json"), JSON.stringify({ extra: { strauss: { namespace_prefix: "AlphaVendor" } } }));
    await mkdir(path.join(root, "plugins"), { recursive: true });
    await symlink(externalPlugin, path.join(root, "plugins", "wpdev-alpha"));

    await assert.rejects(
      execFileAsync(process.execPath, [script, root]),
      (error) => {
        assert.match(error.stderr, /wpdev-alpha: consumer directory symlinks are not allowed/);
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("refuses a requested consumer subset so generated root evidence is always full scope", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-prefix-inventory-subset-"));
  try {
    for (const name of ["wpdev-alpha", "drm-beta"]) {
      const pluginRoot = path.join(root, "plugins", name);
      await mkdir(pluginRoot, { recursive: true });
      await writeFile(path.join(pluginRoot, "wpdev.json"), JSON.stringify({ slug: name, vendorPrefix: "SharedVendor" }));
      await writeFile(path.join(pluginRoot, "composer.json"), JSON.stringify({ extra: { strauss: { namespace_prefix: "SharedVendor" } } }));
    }

    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "wpdev-alpha"]),
      (error) => {
        assert.match(error.stderr, /requested consumers must exactly match the discovered full scope/);
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
