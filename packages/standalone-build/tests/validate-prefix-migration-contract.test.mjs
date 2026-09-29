import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const script = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../validate-prefix-migration-contract.mjs",
);

function contract(overrides = {}) {
  return {
    schema: 1,
    purpose: "prefix-migration-coexistence-contract",
    consumer: "tavangary-theme-panel",
    status: "review-required",
    buildInput: false,
    legacy: {
      vendorPrefix: "WpdevVendor",
      loadability: "legacy-readable",
      classmap: "legacy-classmap",
    },
    target: {
      vendorPrefix: "TavangaryThemePanelVendor",
      runtimePrefix: "TavangaryThemePanelRt",
      classmapPrefix: "TavangaryThemePanelVendor_",
      constantPrefix: "TAVANGARYTHEMEPANELVENDOR_",
    },
    coexistence: {
      loadOrders: ["legacy-first", "target-first"],
      legacyPresent: true,
      duplicateLegacyClaims: "fail-closed",
      sharedSettings: "owner-scoped-merge",
    },
    serialization: {
      strategy: "readable-dto-or-stable-public-class",
      unknownPayload: "non-destructive-stop",
      frozenFixtures: ["pending-legacy-bytes-fixture"],
    },
    publicContracts: {
      hooks: "frozen-public",
      restNamespace: "wpdev/v1",
      storageOption: "wpdev_v2_settings",
    },
    activationOrdering: {
      sandbox: "light-path",
      runtime: "after-legacy-readable-barrier",
      standaloneWpdev: "optional-host",
    },
    rollback: {
      policy: "previous-zip-with-declared-schema-window",
      backupRequired: true,
      cleanup: "no-sibling-data-deletion",
    },
    tests: {
      unit: ["prefix uniqueness", "legacy classmap coexistence"],
      php74: ["legacy-first", "target-first"],
      e2e: ["activation", "shared settings"],
    },
    blockers: ["contract requires lock-owner acceptance and frozen fixtures"],
    ...overrides,
  };
}

async function run(value) {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-prefix-contract-"));
  const file = path.join(root, "contract.json");
  await writeFile(file, JSON.stringify(value));
  try {
    return await execFileAsync(process.execPath, [script, file]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("accepts a review-only contract with explicit coexistence and test matrix", async () => {
  const result = await run(contract());
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "valid-review-evidence");
  assert.equal(report.promotionReady, false);
  assert.match(report.contractDigest, /^[a-f0-9]{64}$/);
});

test("rejects a contract that could be consumed as build input", async () => {
  await assert.rejects(
    run(contract({ buildInput: true })),
    (error) => /buildInput must be false/.test(error.stdout),
  );
});

test("rejects missing load-order coverage", async () => {
  await assert.rejects(
    run(contract({ coexistence: { loadOrders: ["legacy-first"] } })),
    (error) => /loadOrders must include legacy-first and target-first/.test(error.stdout),
  );
});

test("rejects a target prefix that is not unique to the artifact", async () => {
  await assert.rejects(
    run(contract({ target: { vendorPrefix: "WpdevVendor", runtimePrefix: "TavangaryThemePanelRt" } })),
    (error) => /target.vendorPrefix must differ from legacy.vendorPrefix/.test(error.stdout),
  );
});

test("rejects an inventory reference with missing prefix fields", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-prefix-contract-reference-"));
  try {
    const inventory = {
      artifacts: [{ consumer: "tavangary-theme-panel", slug: "tavangary-theme-panel" }],
    };
    const contractPath = path.join(root, "contract.json");
    const inventoryPath = path.join(root, "inventory.json");
    await writeFile(contractPath, JSON.stringify(contract()));
    await writeFile(inventoryPath, JSON.stringify(inventory));
    await assert.rejects(
      execFileAsync(process.execPath, [script, contractPath, inventoryPath]),
      (error) => /target vendor prefix is missing|legacy vendor prefix is missing/.test(error.stdout),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
