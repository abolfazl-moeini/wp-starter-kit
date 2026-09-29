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
  "../validate-protection-registry-proposals.mjs",
);

function proposal(overrides = {}) {
  return {
    schema: 1,
    purpose: "private-runtime-artifact-proposals",
    artifacts: [
      {
        proposedArtifactId: "tavangary-theme-panel-profile-a-001",
        slug: "tavangary-theme-panel",
        recordStatus: "review-only",
        buildInput: false,
        sourceDigest: null,
        toolDigest: null,
        migrationContractDigest: null,
        current: { vendorPrefix: "WpdevVendor" },
        target: {
          vendorPrefix: "TavangaryThemePanelVendor",
          runtimePrefix: "TavangaryThemePanelRt",
        },
        migration: {
          legacyLoadability: true,
          coexistence: "legacy-and-target-classmaps",
          serialization: "frozen-fixtures-required",
          publicHooks: "frozen-public",
          activationOrdering: "legacy-readable-barrier-before-private-runtime",
          rollback: "previous-zip-with-declared-schema-window",
        },
        blockers: ["accepted source/artifact and tool digests are pending"],
        ...overrides,
      },
    ],
  };
}

async function run(value) {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-registry-proposals-"));
  await writeFile(path.join(root, "proposals.json"), JSON.stringify(value));
  try {
    return await execFileAsync(process.execPath, [script, path.join(root, "proposals.json")]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("accepts an explicit review-only proposal without release digests", async () => {
  const result = await run(proposal());
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "valid-review-evidence");
  assert.equal(report.promotionReady, false);
});

test("rejects proposals that could be consumed as build input", async () => {
  await assert.rejects(
    run(proposal({ buildInput: true })),
    (error) => /buildInput must be false/.test(error.stdout),
  );
});

test("rejects fabricated digest values in review-only proposals", async () => {
  await assert.rejects(
    run(proposal({ sourceDigest: "a".repeat(64) })),
    (error) => /sourceDigest must be null/.test(error.stdout),
  );
});
