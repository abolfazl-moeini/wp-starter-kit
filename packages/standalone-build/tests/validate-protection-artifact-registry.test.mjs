import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const script = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../validate-protection-artifact-registry.mjs",
);

function inventory() {
  return {
    schema: 1,
    artifacts: [
      {
        consumer: "fixture-plugin",
        slug: "fixture-plugin",
        currentVendorPrefix: "WpdevVendor",
        proposedVendorPrefix: "FixturePluginVendor",
      },
    ],
  };
}

function registry(overrides = {}) {
  return {
    version: 1,
    registryPurpose: "private-runtime-artifacts",
    digestScheme: "sha256(sorted-posix-path\\0file-bytes\\0)",
    artifacts: [
      {
        artifactId: "fixture-plugin-001",
        slug: "fixture-plugin",
        runtimePrefix: "FixturePluginRuntime",
        vendorPrefix: "FixturePluginVendor",
        sourceDigest: "a".repeat(64),
        toolDigest: "b".repeat(64),
        ...overrides,
      },
    ],
  };
}

async function run(root) {
  return execFileAsync(process.execPath, [script, root, "registry.json", "inventory.json"]);
}

async function runAbsolute(root) {
  return execFileAsync(process.execPath, [script, root, path.join(root, "registry.json"), path.join(root, "inventory.json")]);
}

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-prefix-registry-"));
  await writeFile(path.join(root, "registry.json"), JSON.stringify(registry()));
  await writeFile(path.join(root, "inventory.json"), JSON.stringify(inventory()));
  return root;
}

test("accepts a unique registry entry that matches the proposed inventory prefix", async () => {
  const root = await fixture();
  try {
    const result = await run(root);
    const report = JSON.parse(result.stdout);
    assert.equal(report.status, "ready");
    assert.match(report.registryDigest, /^[a-f0-9]{64}$/);
    assert.match(report.inventoryDigest, /^[a-f0-9]{64}$/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("accepts explicitly supplied absolute registry and inventory paths", async () => {
  const root = await fixture();
  try {
    const result = await runAbsolute(root);
    assert.match(result.stdout, /"status": "ready"/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects duplicate immutable artifact and vendor-prefix claims", async () => {
  const root = await fixture();
  try {
    const value = registry();
    value.artifacts.push({ ...value.artifacts[0], artifactId: "fixture-plugin-002" });
    await writeFile(path.join(root, "registry.json"), JSON.stringify(value));

    await assert.rejects(
      run(root),
      (error) => /duplicate artifactId|duplicate slug|duplicate vendorPrefix/.test(error.stdout),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects an inventory entry whose proposed prefix disagrees with the registry", async () => {
  const root = await fixture();
  try {
    const value = inventory();
    value.artifacts[0].proposedVendorPrefix = "OtherVendor";
    await writeFile(path.join(root, "inventory.json"), JSON.stringify(value));

    await assert.rejects(
      run(root),
      (error) => /proposedVendorPrefix mismatch/.test(error.stdout),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects registry evidence addressed through a symlink", async () => {
  const root = await fixture();
  const target = path.join(root, "registry-target.json");
  try {
    await writeFile(target, await readFile(path.join(root, "registry.json")));
    await rm(path.join(root, "registry.json"));
    await symlink(target, path.join(root, "registry.json"));

    await assert.rejects(
      runAbsolute(root),
      (error) => /symlink evidence path is not allowed/.test(error.stdout),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports malformed registry collections without crashing", async () => {
  const root = await fixture();
  try {
    const value = registry();
    value.artifacts = { not: "an array" };
    await writeFile(path.join(root, "registry.json"), JSON.stringify(value));
    await assert.rejects(
      run(root),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.equal(report.status, "blocked");
        assert.ok(report.failures.includes("registry: artifacts must be a non-empty array"));
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
