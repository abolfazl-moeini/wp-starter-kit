import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const exec = promisify(execFile);
const script = path.resolve(packageRoot, "validate-profile-a-pre-registry-candidate.mjs");
test("rejects a dirty candidate and accepts strict metadata", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "candidate-"));
  const tool = path.join(root, "tool.mjs"); await writeFile(tool, "tool\n");
  const crypto = await import("node:crypto"); const digest = crypto.createHash("sha256").update("tool\n").digest("hex");
  const contractPath = path.join(root, "plugins/tavangary-theme-panel/dev/prefix-migration-coexistence-contract.json"); await mkdir(path.dirname(contractPath), { recursive: true }); await writeFile(contractPath, "{}\n"); const contractDigest = crypto.createHash("sha256").update("{}\n").digest("hex");
  const m = { schema:1, purpose:"profile-a-pre-registry-candidate", consumer:"tavangary-theme-panel", recordStatus:"review-only", buildInput:false, source:{repositoryRoot:"plugins/tavangary-theme-panel",commit:"a".repeat(40),tree:"b".repeat(64),worktree:"clean"}, toolInputs:[{path:"tool.mjs",sha256:digest}], migrationContract:{path:"plugins/tavangary-theme-panel/dev/prefix-migration-coexistence-contract.json",sha256:contractDigest}, target:{vendorPrefix:"T",runtimePrefix:"R",classmapPrefix:"C",constantPrefix:"K"}, digests:{source:null,artifact:null,toolBundle:null}, blockers:["pending"] };
  const file = path.join(root, "candidate.json"); await writeFile(file, JSON.stringify(m));
  const result = await exec(process.execPath, [script, file, root]); assert.equal(JSON.parse(result.stdout).status, "valid-review-evidence"); await rm(root,{recursive:true,force:true});
});
test("rejects dirty worktree", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "candidate-")); const file = path.join(root,"candidate.json"); await writeFile(file, JSON.stringify({schema:1,source:{worktree:"dirty"}}));
  await assert.rejects(exec(process.execPath,[script,file,root]), e => /worktree must be clean/.test(e.stdout)); await rm(root,{recursive:true,force:true});
});
test("accepts a 40-character SHA-1 tree object", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "candidate-"));
  const tool = path.join(root, "tool.mjs"); await writeFile(tool, "tool\n");
  const crypto = await import("node:crypto"); const digest = crypto.createHash("sha256").update("tool\n").digest("hex");
  const contractPath = path.join(root, "plugins/tavangary-theme-panel/dev/prefix-migration-coexistence-contract.json"); await mkdir(path.dirname(contractPath), { recursive: true }); await writeFile(contractPath, "{}\n"); const contractDigest = crypto.createHash("sha256").update("{}\n").digest("hex");
  const m = { schema:1, purpose:"profile-a-pre-registry-candidate", consumer:"tavangary-theme-panel", recordStatus:"review-only", buildInput:false, source:{repositoryRoot:"plugins/tavangary-theme-panel",commit:"a".repeat(40),tree:"b".repeat(40),worktree:"clean"}, toolInputs:[{path:"tool.mjs",sha256:digest}], migrationContract:{path:"plugins/tavangary-theme-panel/dev/prefix-migration-coexistence-contract.json",sha256:contractDigest}, target:{vendorPrefix:"T",runtimePrefix:"R",classmapPrefix:"C",constantPrefix:"K"}, digests:{source:null,artifact:null,toolBundle:null}, blockers:["pending"] };
  const file = path.join(root, "candidate.json"); await writeFile(file, JSON.stringify(m));
  const result = await exec(process.execPath, [script, file, root]); assert.equal(JSON.parse(result.stdout).status, "valid-review-evidence"); await rm(root,{recursive:true,force:true});
});
test("rejects tool inputs containing platform path separators", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "candidate-"));
  const file = path.join(root, "candidate.json");
  const m = { schema:1, purpose:"profile-a-pre-registry-candidate", consumer:"tavangary-theme-panel", recordStatus:"review-only", buildInput:false, source:{repositoryRoot:"plugins/tavangary-theme-panel",commit:"a".repeat(40),tree:"b".repeat(40),worktree:"clean"}, toolInputs:[{path:"tools\\run.mjs",sha256:"a".repeat(64)}], migrationContract:{path:"plugins/tavangary-theme-panel/dev/prefix-migration-coexistence-contract.json",sha256:"b".repeat(64)}, target:{vendorPrefix:"T",runtimePrefix:"R",classmapPrefix:"C",constantPrefix:"K"}, digests:{source:null,artifact:null,toolBundle:null}, blockers:["pending"] };
  await writeFile(file, JSON.stringify(m));
  await assert.rejects(exec(process.execPath, [script, file, root]), e => e.stdout.includes("invalid tool input"));
  await rm(root,{recursive:true,force:true});
});
test("rejects missing or relative contentRoot", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "candidate-"));
  const file = path.join(root, "candidate.json");
  const m = { schema:1, purpose:"profile-a-pre-registry-candidate", consumer:"tavangary-theme-panel", recordStatus:"review-only", buildInput:false, source:{repositoryRoot:"plugins/tavangary-theme-panel",commit:"a".repeat(40),tree:"b".repeat(40),worktree:"clean"}, toolInputs:[{path:"tools/run.mjs",sha256:"a".repeat(64)}], migrationContract:{path:"plugins/tavangary-theme-panel/dev/prefix-migration-coexistence-contract.json",sha256:"b".repeat(64)}, target:{vendorPrefix:"T",runtimePrefix:"R",classmapPrefix:"C",constantPrefix:"K"}, digests:{source:null,artifact:null,toolBundle:null}, blockers:["pending"] };
  await writeFile(file, JSON.stringify(m));
  await assert.rejects(exec(process.execPath, [script, file]), e => e.stdout.includes("contentRoot path must be absolute"));
  await assert.rejects(exec(process.execPath, [script, file, "relative/root"]), e => e.stdout.includes("contentRoot path must be absolute"));
  await rm(root,{recursive:true,force:true});
});
test("rejects duplicate tool inputs and promotion flags", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "candidate-"));
  const tool = path.join(root, "tool.mjs"); await writeFile(tool, "tool\n");
  const crypto = await import("node:crypto"); const digest = crypto.createHash("sha256").update("tool\n").digest("hex");
  const contractPath = path.join(root, "plugins/tavangary-theme-panel/dev/prefix-migration-coexistence-contract.json"); await mkdir(path.dirname(contractPath), { recursive: true }); await writeFile(contractPath, "{}\n"); const contractDigest = crypto.createHash("sha256").update("{}\n").digest("hex");
  const m = { schema:1, purpose:"profile-a-pre-registry-candidate", consumer:"tavangary-theme-panel", recordStatus:"review-only", buildInput:false, source:{repositoryRoot:"plugins/tavangary-theme-panel",commit:"a".repeat(40),tree:"b".repeat(40),worktree:"clean"}, toolInputs:[{path:"tool.mjs",sha256:digest},{path:"tool.mjs",sha256:digest}], migrationContract:{path:"plugins/tavangary-theme-panel/dev/prefix-migration-coexistence-contract.json",sha256:contractDigest}, target:{vendorPrefix:"T",runtimePrefix:"R",classmapPrefix:"C",constantPrefix:"K"}, digests:{source:null,artifact:null,toolBundle:null}, blockers:["pending"] };
  const file = path.join(root, "candidate.json"); await writeFile(file, JSON.stringify(m));
  await assert.rejects(exec(process.execPath, [script, file, root]), e => e.stdout.includes("duplicate tool input"));
  
  await writeFile(file, JSON.stringify({ ...m, toolInputs: [{ path: "tool.mjs", sha256: digest }], promotionReady: true }));
  await assert.rejects(exec(process.execPath, [script, file, root]), e => e.stdout.includes("promotion/approval fields cannot be enabled"));
  
  await writeFile(file, JSON.stringify({ ...m, toolInputs: [{ path: "tool.mjs", sha256: digest }], source: { ...m.source, repositoryRoot: "plugins/tavangary-theme-panel-dev" } }));
  await assert.rejects(exec(process.execPath, [script, file, root]), e => e.stdout.includes("source.repositoryRoot must use canonical path"));
  
  await rm(root,{recursive:true,force:true});
});

