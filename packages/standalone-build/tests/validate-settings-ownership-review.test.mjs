import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const script = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../validate-settings-ownership-review.mjs",
);

function inventory(overrides = {}) {
  return {
    schema: 1,
    generatedBy: "tools/settings-field-inventory.mjs",
    storage: "wpdev_v2_settings",
    plugins: {
      pilot: {
        storage: "wpdev_v2_settings",
        fields: {
          owned_field: ["includes/settings.php"],
          second_field: ["includes/other.php"],
        },
        directAccess: {
          owned_field: ["includes/read.php"],
        },
      },
    },
    collisions: {},
    unresolved: "Dynamic registrations remain review-required.",
    ...overrides,
  };
}

function manifest(overrides = {}) {
  return {
    schema: 1,
    generatedBy: "tools/generate-settings-ownership-review-manifest.mjs",
    status: "review-required",
    buildInput: false,
    storage: "wpdev_v2_settings",
    consumer: "pilot",
    reviewApproval: {
      schema: 1,
      approver: "Fixture reviewer",
      date: "2026-08-28",
      accurateList: true,
      scope: "Fixture verifies static settings ownership evidence.",
      limitations: ["Dynamic registrations and mixed-version behavior remain unresolved."],
      promotionImpact: "review-only",
    },
    ownershipDecision: { status: "approved-for-static-registrations", owner: "pilot" },
    sourceInventory: "settings-field-inventory.json",
    candidateFields: [
      {
        key: "owned_field",
        owner: "pilot",
        status: "unclassified",
        evidence: { registeredBy: ["includes/settings.php"], directAccess: ["includes/read.php"] },
      },
      {
        key: "second_field",
        owner: "pilot",
        status: "unclassified",
        evidence: { registeredBy: ["includes/other.php"], directAccess: [] },
      },
    ],
    blockers: {
      literalCrossProductCollisions: {},
      directAccessWithoutRegistration: [],
      unresolvedInventoryScope: "Dynamic registrations remain review-required.",
    },
    promotionRules: [
      "The shared wpdev_v2_settings option must retain unknown sibling keys during mixed-version saves.",
    ],
    ...overrides,
  };
}

async function fixture({ inventoryValue = inventory(), manifestValue = manifest() } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "settings-ownership-review-"));
  await mkdir(path.join(root, "plugins/pilot/dev"), { recursive: true });
  await writeJson(path.join(root, "protection-consumer-source-map.json"), {
    schema: 1,
    consumers: { pilot: "plugins/pilot" },
  });
  await writeJson(path.join(root, "settings-field-inventory.json"), inventoryValue);
  await writeJson(path.join(root, "plugins/pilot/dev/settings-ownership-review-manifest.json"), manifestValue);
  return root;
}

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value)}\n`);
}

async function run(root) {
  return execFileAsync(process.execPath, [script, root, "pilot"]);
}

test("accepts structurally consistent settings ownership evidence as review-only", async () => {
  const root = await fixture();
  try {
    const result = await run(root);
    const report = JSON.parse(result.stdout);
    assert.equal(report.status, "valid-review-evidence");
    assert.equal(report.promotionReady, false);
    assert.deepEqual(report.fieldCounts, { inventory: 2, manifest: 2, matched: 2 });
    assert.ok(report.blockers.includes("Dynamic registrations remain review-required."));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects stale or incomplete field evidence", async () => {
  const root = await fixture({
    manifestValue: manifest({
      candidateFields: manifest().candidateFields.slice(0, 1),
    }),
  });
  try {
    await assert.rejects(
      run(root),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.equal(report.status, "blocked");
        assert.ok(report.failures.some((failure) => failure.includes("candidateFields does not exactly match")));
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("accepts a valid approved settings ownership manifest", async () => {
  const approvedManifest = manifest({
    status: "approved",
    buildInput: true,
    candidateFields: manifest().candidateFields.map((f) => ({ ...f, status: "approved" })),
    blockers: {
      literalCrossProductCollisions: {},
      directAccessWithoutRegistration: [],
      unresolvedInventoryScope: null,
    },
  });
  const root = await fixture({ manifestValue: approvedManifest });
  try {
    const result = await run(root);
    const report = JSON.parse(result.stdout);
    assert.equal(report.status, "valid-review-evidence");
    assert.equal(report.promotionReady, false);
    assert.deepEqual(report.fieldCounts, { inventory: 2, manifest: 2, matched: 2 });
    assert.deepEqual(report.blockers, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects an approved manifest when candidate fields are unclassified or buildInput is false", async () => {
  const root = await fixture({ manifestValue: manifest({ buildInput: false, status: "approved" }) });
  try {
    await assert.rejects(
      run(root),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.ok(report.failures.includes("manifest: buildInput must be true"));
        assert.ok(report.failures.some((f) => f.includes("status must be approved")));
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects symlinked settings evidence", async () => {
  const root = await fixture();
  try {
    const target = path.join(root, "settings-field-inventory.json");
    await rm(target);
    await writeJson(path.join(root, "inventory-target.json"), inventory());
    await symlink(path.join(root, "inventory-target.json"), target);
    // Keep this fixture focused on the inventory path failure; otherwise a
    // missing inventory would make manifest cross-checks unavailable.
    await rm(path.join(root, "plugins/pilot/dev/settings-ownership-review-manifest.json"));
    await assert.rejects(
      run(root),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.ok(report.failures.some((failure) => failure.includes("symlink evidence path is not allowed")));
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
