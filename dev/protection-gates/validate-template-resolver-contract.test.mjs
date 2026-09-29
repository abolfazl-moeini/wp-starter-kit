import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const script = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "validate-template-resolver-contract.mjs",
);
const valid = { schema: 1, status: "review-required", buildInput: false, source: { path: "plugins/p/src/a.php", expression: "$template", call: "wpdev_get_template" }, resolver: { rootPolicy: "registered", viewPolicy: "relative" }, failClosed: ["missing root"], evidence: { implementation: "plugins/p/src/r.php", tests: ["plugins/p/tests/r.php"] }, blockers: ["pending"] };

test("accepts review-only resolver evidence", async () => { const dir = await mkdtemp(path.join(os.tmpdir(), "resolver-")); const file = path.join(dir, "contract.json"); await writeFile(file, JSON.stringify(valid)); const { stdout } = await exec(process.execPath, [script, file, dir]); assert.equal(JSON.parse(stdout).status, "valid-review-evidence"); });
test("accepts resolver evidence covered by the closure unresolved include", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "resolver-"));
  const file = path.join(dir, "contract.json"); const closure = path.join(dir, "closure.json");
  await writeFile(file, JSON.stringify(valid));
  await writeFile(closure, JSON.stringify({ blockers: { unresolvedIncludes: [{ path: valid.source.path, expression: valid.source.expression }] } }));
  const { stdout } = await exec(process.execPath, [script, file, dir, closure]);
  assert.equal(JSON.parse(stdout).status, "valid-review-evidence");
});
test("rejects stale resolver coverage in the closure unresolved includes", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "resolver-"));
  const file = path.join(dir, "contract.json"); const closure = path.join(dir, "closure.json");
  await writeFile(file, JSON.stringify(valid));
  await writeFile(closure, JSON.stringify({ blockers: { unresolvedIncludes: [{ path: "plugins/p/src/other.php", expression: valid.source.expression }] } }));
  await assert.rejects(exec(process.execPath, [script, file, dir, closure]));
});
test("rejects unresolved coverage entries with missing expression", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "resolver-"));
  const file = path.join(dir, "contract.json"); const closure = path.join(dir, "closure.json");
  await writeFile(file, JSON.stringify(valid));
  await writeFile(closure, JSON.stringify({ blockers: { unresolvedIncludes: [{ path: valid.source.path }] } }));
  await assert.rejects(exec(process.execPath, [script, file, dir, closure]));
});
test("rejects promotion input and unsafe paths", async () => { const dir = await mkdtemp(path.join(os.tmpdir(), "resolver-")); const file = path.join(dir, "contract.json"); await writeFile(file, JSON.stringify({ ...valid, buildInput: true, evidence: { ...valid.evidence, implementation: "../escape.php" } })); await assert.rejects(exec(process.execPath, [script, file, dir])); });
test("rejects normalized paths containing parent traversal", async () => { const dir = await mkdtemp(path.join(os.tmpdir(), "resolver-")); const file = path.join(dir, "contract.json"); await writeFile(file, JSON.stringify({ ...valid, evidence: { ...valid.evidence, implementation: "plugins/p/src/../r.php" } })); await assert.rejects(exec(process.execPath, [script, file, dir])); });
test("accepts an approved resolver contract whose closure manifest records the resolution", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "resolver-"));
  const file = path.join(dir, "contract.json"); const closure = path.join(dir, "closure.json");
  const approved = { ...valid, status: "approved", buildInput: true, blockers: [], resolution: { policy: "bounded-registered-root", evidence: ["plugins/p/src/r.php"] } };
  await writeFile(file, JSON.stringify(approved));
  await writeFile(closure, JSON.stringify({ status: "approved", blockers: { unresolvedIncludes: [] }, resolvedDynamicIncludes: [{ path: valid.source.path, expression: valid.source.expression }] }));
  const { stdout } = await exec(process.execPath, [script, file, dir, closure]);
  assert.equal(JSON.parse(stdout).status, "valid-review-evidence");
});
test("rejects an approved resolver contract without resolution evidence", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "resolver-"));
  const file = path.join(dir, "contract.json"); const closure = path.join(dir, "closure.json");
  await writeFile(file, JSON.stringify({ ...valid, status: "approved", buildInput: true, blockers: [] }));
  await writeFile(closure, JSON.stringify({ status: "approved", blockers: { unresolvedIncludes: [] }, resolvedDynamicIncludes: [{ path: valid.source.path, expression: valid.source.expression }] }));
  await assert.rejects(exec(process.execPath, [script, file, dir, closure]), (e) => e.stdout.includes("resolution"));
  const unsafe = { ...valid, status: "approved", buildInput: true, blockers: [], resolution: { policy: "bounded", evidence: ["../escape.php"] } };
  await writeFile(file, JSON.stringify(unsafe));
  await assert.rejects(exec(process.execPath, [script, file, dir, closure]), (e) => e.stdout.includes("resolution"));
});
test("rejects an approved resolver contract whose edge is still unresolved in the closure", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "resolver-"));
  const file = path.join(dir, "contract.json"); const closure = path.join(dir, "closure.json");
  const approved = { ...valid, status: "approved", buildInput: true, blockers: [], resolution: { policy: "bounded", evidence: ["plugins/p/src/r.php"] } };
  await writeFile(file, JSON.stringify(approved));
  await writeFile(closure, JSON.stringify({ status: "approved", blockers: { unresolvedIncludes: [{ path: valid.source.path, expression: valid.source.expression }] } }));
  await assert.rejects(exec(process.execPath, [script, file, dir, closure]), (e) => e.stdout.includes("still unresolved"));
  await writeFile(closure, JSON.stringify({ status: "approved", blockers: { unresolvedIncludes: [] }, resolvedDynamicIncludes: [] }));
  await assert.rejects(exec(process.execPath, [script, file, dir, closure]), (e) => e.stdout.includes("resolution record"));
});
