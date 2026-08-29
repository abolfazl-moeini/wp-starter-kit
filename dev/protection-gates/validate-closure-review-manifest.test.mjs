import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
const exec = promisify(execFile); const script = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "validate-closure-review-manifest.mjs",
);
const base = { schema: 1, status: "review-required", buildInput: false, consumer: "p", sourceInventory: "inventory.json", reviewApproval: { promotionImpact: "review-only" }, candidatePaths: [{ path: "src/a.php", status: "unclassified", proposedRole: null, evidence: {} }], blockers: { unresolvedIncludes: [{ path: "src/a.php", expression: "$x" }] }, promotionRules: ["review"] };
async function run(data) { const d = await mkdtemp(path.join(os.tmpdir(), "closure-")); await writeFile(path.join(d, "manifest.json"), JSON.stringify(data)); await writeFile(path.join(d, "inventory.json"), "{}"); return exec(process.execPath, [script, d, "p", path.join(d, "manifest.json")]); }
test("accepts review-only closure evidence", async () => assert.equal(JSON.parse((await run(base)).stdout).status, "valid-review-evidence"));
test("rejects promotion input and unsafe candidates", async () => await assert.rejects(run({ ...base, buildInput: true, candidatePaths: [{ ...base.candidatePaths[0], path: "../escape.php" }] })));
test("rejects malformed unresolved includes", async () => await assert.rejects(run({ ...base, blockers: { unresolvedIncludes: [{ path: "src/a.php" }] } })));
test("resolves canonical mapped source directory and rejects symlinked source map", async () => {
  const d = await mkdtemp(path.join(os.tmpdir(), "closure-map-"));
  const consumerDir = path.join(d, "plugins/my-plugin/dev");
  await import("node:fs/promises").then(({ mkdir }) => mkdir(consumerDir, { recursive: true }));
  await writeFile(path.join(consumerDir, "closure-review-manifest.json"), JSON.stringify({ ...base, consumer: "my-plugin" }));
  await writeFile(path.join(d, "inventory.json"), "{}");
  await writeFile(path.join(d, "protection-consumer-source-map.json"), JSON.stringify({ schema: 1, consumers: { "my-plugin": "plugins/my-plugin" } }));
  const res = await exec(process.execPath, [script, d, "my-plugin"]);
  assert.equal(JSON.parse(res.stdout).status, "valid-review-evidence");

  // Rejects symlinked source map
  const mapFile = path.join(d, "protection-consumer-source-map.json");
  const realMap = `${mapFile}.real`;
  await import("node:fs/promises").then(async ({ rename, symlink }) => {
    await rename(mapFile, realMap);
    await symlink(realMap, mapFile);
  });
  await assert.rejects(exec(process.execPath, [script, d, "my-plugin"]));
});

test("accepts an approved build-input closure manifest with roles and empty blockers", async () => {
  const approved = {
    ...base,
    status: "approved",
    buildInput: true,
    candidatePaths: [
      { path: "src/a.php", status: "approved", proposedRole: "encode", evidence: {} },
      { path: "src/b.php", status: "approved", proposedRole: "readable-preflight", evidence: {} },
    ],
    blockers: { unresolvedIncludes: [], unresolvedFunctions: [], unresolvedClasses: [], unresolvedHooks: [] },
  };
  assert.equal(JSON.parse((await run(approved)).stdout).status, "valid-review-evidence");
});
test("rejects an approved manifest with a missing or unknown role", async () => {
  const roleless = { ...base, status: "approved", buildInput: true, candidatePaths: [{ path: "src/a.php", status: "approved", proposedRole: null, evidence: {} }], blockers: { unresolvedIncludes: [] } };
  await assert.rejects(run(roleless), (e) => e.stdout.includes("proposedRole is not an allowed role"));
  const unknown = { ...roleless, candidatePaths: [{ path: "src/a.php", status: "approved", proposedRole: "readable-somewhat", evidence: {} }] };
  await assert.rejects(run(unknown), (e) => e.stdout.includes("proposedRole is not an allowed role"));
});
test("rejects an approved manifest with unapproved candidates or unresolved blockers", async () => {
  const unapproved = { ...base, status: "approved", buildInput: true, blockers: { unresolvedIncludes: [] } };
  await assert.rejects(run(unapproved), (e) => e.stdout.includes("candidatePaths[0].status is invalid"));
  const unresolved = { ...base, status: "approved", buildInput: true, candidatePaths: [{ path: "src/a.php", status: "approved", proposedRole: "encode", evidence: {} }], blockers: { unresolvedIncludes: [{ path: "src/a.php", expression: "$x" }] } };
  await assert.rejects(run(unresolved), (e) => e.stdout.includes("unresolved blocker unresolvedIncludes"));
});
test("rejects review-required evidence that claims build input", async () => {
  await assert.rejects(run({ ...base, buildInput: true }));
  await assert.rejects(run({ ...base, status: "approved", buildInput: false, candidatePaths: [{ path: "src/a.php", status: "approved", proposedRole: "encode", evidence: {} }], blockers: { unresolvedIncludes: [] } }), (e) => e.stdout.includes("buildInput must be true"));
});
