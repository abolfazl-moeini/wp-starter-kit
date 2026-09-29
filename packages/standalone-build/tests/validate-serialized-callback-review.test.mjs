import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const exec = promisify(execFile);
const script = path.resolve(packageRoot, "validate-serialized-callback-review.mjs");
const inv = { schema: 1, consumer: "pilot", status: "review-required", buildInput: false, findings: [{ file: "plugins/p/src/a.php", line: 7, kind: "deserialization", operation: "unserialize" }], blockers: { persistedCallbackClosure: "pending" } };
const manifest = { schema: 1, consumer: "pilot", sourceInventory: "serialized-callback-inventory.json", status: "review-required", buildInput: false, reviewApproval: { promotionImpact: "review-only", limitations: ["pending"] }, candidateFindings: [{ ...inv.findings[0], status: "unclassified", compatibility: "unclassified" }], blockers: { persistedCallbackClosure: "pending" }, promotionRules: ["unknown values block"] };
async function setup() { const root = await mkdtemp(path.join(os.tmpdir(), "serialized-review-")); const dir = path.join(root, "plugins/pilot-dev/dev"); await import("node:fs/promises").then(({ mkdir }) => mkdir(dir, { recursive: true })); await writeFile(path.join(dir, "serialized-callback-inventory.json"), JSON.stringify(inv)); await writeFile(path.join(dir, "serialized-callback-review-manifest.json"), JSON.stringify(manifest)); return root; }
test("accepts review-only serialized callback evidence", async () => { const root = await setup(); const { stdout } = await exec(process.execPath, [script, root, "pilot"]); const report = JSON.parse(stdout); assert.equal(report.status, "valid-review-evidence"); assert.equal(report.promotionReady, false); });
test("rejects promotion input and mismatched findings", async () => { const root = await setup(); const file = path.join(root, "plugins/pilot-dev/dev/serialized-callback-review-manifest.json"); await writeFile(file, JSON.stringify({ ...manifest, buildInput: true, candidateFindings: [] })); await assert.rejects(exec(process.execPath, [script, root, "pilot"])); });
test("rejects symlinked evidence", async () => { const root = await setup(); const file = path.join(root, "plugins/pilot-dev/dev/serialized-callback-review-manifest.json"); const real = `${file}.real`; await writeFile(real, JSON.stringify(manifest)); await import("node:fs/promises").then(({ unlink }) => unlink(file)); await symlink(real, file); await assert.rejects(exec(process.execPath, [script, root, "pilot"])); });
test("rejects an inventory without an explicit findings array", async () => { const root = await setup(); const file = path.join(root, "plugins/pilot-dev/dev/serialized-callback-inventory.json"); await writeFile(file, JSON.stringify({ ...inv, findings: null })); await assert.rejects(exec(process.execPath, [script, root, "pilot"])); });
test("rejects review approval with empty limitations", async () => { const root = await setup(); const file = path.join(root, "plugins/pilot-dev/dev/serialized-callback-review-manifest.json"); await writeFile(file, JSON.stringify({ ...manifest, reviewApproval: { ...manifest.reviewApproval, limitations: [] } })); await assert.rejects(exec(process.execPath, [script, root, "pilot"])); });
test("resolves canonical mapped source directory and rejects symlinked source map", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "serialized-map-"));
  const dir = path.join(root, "plugins/pilot/dev");
  await import("node:fs/promises").then(({ mkdir }) => mkdir(dir, { recursive: true }));
  await writeFile(path.join(dir, "serialized-callback-inventory.json"), JSON.stringify(inv));
  await writeFile(path.join(dir, "serialized-callback-review-manifest.json"), JSON.stringify(manifest));
  await writeFile(path.join(root, "protection-consumer-source-map.json"), JSON.stringify({ schema: 1, consumers: { pilot: "plugins/pilot" } }));
  const { stdout } = await exec(process.execPath, [script, root, "pilot"]);
  assert.equal(JSON.parse(stdout).status, "valid-review-evidence");

  // Rejects symlinked source map
  const mapFile = path.join(root, "protection-consumer-source-map.json");
  const realMap = `${mapFile}.real`;
  await import("node:fs/promises").then(async ({ rename, symlink }) => {
    await rename(mapFile, realMap);
    await symlink(realMap, mapFile);
  });
  await assert.rejects(exec(process.execPath, [script, root, "pilot"]));
});

