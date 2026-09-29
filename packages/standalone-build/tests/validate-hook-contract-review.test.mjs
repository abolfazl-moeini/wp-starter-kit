import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const execFileAsync = promisify(execFile);
const script = path.resolve(packageRoot, "validate-hook-contract-review.mjs");
const base = { schema: 1, policyDecision: { status: "approved-hybrid-facade" }, scope: { consumer: "pilot" }, contracts: { hook: { consumerListeners: [], consumerProducers: [], frameworkProducers: [], matchingFrameworkDynamicProducers: [], ownership: "unclassified", compatibility: "frozen-public" } } };
test("accepts review-only hook evidence while retaining blockers", async () => { const dir = await mkdtemp(path.join(os.tmpdir(), "hook-review-")); try { const file = path.join(dir, "inventory.json"); await writeFile(file, JSON.stringify(base)); const { stdout } = await execFileAsync(process.execPath, [script, file, "pilot"]); const report = JSON.parse(stdout); assert.equal(report.status, "valid-review-evidence"); assert.equal(report.promotionReady, false); assert.equal(report.blockerCount, 1); } finally { await rm(dir, { recursive: true, force: true }); } });
test("rejects malformed dynamic producer evidence", async () => { const dir = await mkdtemp(path.join(os.tmpdir(), "hook-review-")); try { const file = path.join(dir, "inventory.json"); const bad = structuredClone(base); bad.contracts.hook.matchingFrameworkDynamicProducers = [{ template: "x" }]; await writeFile(file, JSON.stringify(bad)); await assert.rejects(execFileAsync(process.execPath, [script, file, "pilot"])); } finally { await rm(dir, { recursive: true, force: true }); } });
test("rejects absolute and traversal evidence paths", async () => { const dir = await mkdtemp(path.join(os.tmpdir(), "hook-review-")); try { const file = path.join(dir, "inventory.json"); const bad = structuredClone(base); bad.contracts.hook.consumerListeners = [{ path: "../outside.php", line: 1, operation: "add_action" }]; await writeFile(file, JSON.stringify(bad)); await assert.rejects(execFileAsync(process.execPath, [script, file, "pilot"])); } finally { await rm(dir, { recursive: true, force: true }); } });
