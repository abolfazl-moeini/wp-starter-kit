import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  resolveImpactedTests,
  TEST_DEPENDENCY_GRAPH,
  BASELINE_HEALTH_TESTS,
} from "../test-impact-map.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const allTestFiles = fs.readdirSync(scriptDir).filter((f) => f.endsWith(".test.mjs"));

test("Test Impact Map: full mode selects all test files", () => {
  const result = resolveImpactedTests({
    changedKeys: ["wpdev-crm"],
    allTestFiles,
    mode: "full",
  });
  assert.equal(result.selected.length, allTestFiles.length);
  assert.equal(result.skipped.length, 0);
});

test("Test Impact Map: zero changes in affected mode selects baseline health tests", () => {
  const result = resolveImpactedTests({
    changedKeys: [],
    allTestFiles,
    mode: "affected",
  });
  assert.ok(result.selected.length >= 2, "Must select baseline health tests");
  assert.ok(result.skipped.length > 0, "Must skip non-affected tests");
  assert.ok(result.selected.includes("atomic-deploy-and-cache-integrity.test.mjs"));
});

test("Test Impact Map: single plugin change selects only target artifact tests", () => {
  const result = resolveImpactedTests({
    changedKeys: ["wpdev-crm"],
    allTestFiles,
    mode: "affected",
  });
  assert.ok(result.selected.includes("wpdev-crm-artifact.test.mjs"));
  assert.ok(result.selected.includes("verify-profile-s-artifact.test.mjs"));
  assert.ok(!result.selected.includes("tavangary-core-artifact.test.mjs"));
  assert.ok(!result.selected.includes("wpdev-tickets-artifact.test.mjs"));
});

test("Test Impact Map: unknown key falls back safely to full suite", () => {
  const result = resolveImpactedTests({
    changedKeys: ["unknown_subsystem_x"],
    allTestFiles,
    mode: "affected",
  });
  assert.equal(result.selected.length, allTestFiles.length);
  assert.equal(result.skipped.length, 0);
});

test("Test Impact Map: contract and artifact modes select their respective suites", () => {
  const contractRes = resolveImpactedTests({
    changedKeys: [],
    allTestFiles,
    mode: "contract",
  });
  assert.ok(contractRes.selected.includes("transformer-correctness-matrix.test.mjs"));

  const artifactRes = resolveImpactedTests({
    changedKeys: [],
    allTestFiles,
    mode: "artifact",
  });
  assert.ok(artifactRes.selected.includes("wpdev-crm-artifact.test.mjs"));
  assert.ok(artifactRes.selected.includes("tavangary-core-artifact.test.mjs"));
});

test("Test Impact Map: rejects invalid mode with fail-closed exception", () => {
  assert.throws(() => {
    resolveImpactedTests({
      changedKeys: [],
      allTestFiles,
      mode: "invalid_unrecognized_mode",
    });
  }, /Invalid test mode/);
});

test("Test Impact Map: direct test file modification triggers itself", () => {
  const result = resolveImpactedTests({
    changedKeys: ["atomic-deploy-and-cache-integrity.test.mjs"],
    allTestFiles,
    mode: "affected",
  });
  assert.ok(result.selected.includes("atomic-deploy-and-cache-integrity.test.mjs"));
});

test("Test Impact Map: theme key is impact-only and unknown files fall back to full suite", () => {
  const themeRes = resolveImpactedTests({
    changedKeys: ["themes/tavangary"],
    allTestFiles,
    mode: "affected",
  });
  assert.ok(themeRes.selected.includes("tavangary-theme-panel-artifact.test.mjs"));
  assert.ok(themeRes.reason.includes("themes/tavangary"));

  const unknownRes = resolveImpactedTests({
    changedKeys: ["some-new-tool.mjs"],
    allTestFiles,
    mode: "affected",
  });
  assert.equal(unknownRes.selected.length, allTestFiles.length);
  assert.match(unknownRes.reason, /Unknown changed key/);
});

test("Test Impact Map: mapped missing test file is fail-closed, not silently dropped", () => {
  assert.throws(() => {
    resolveImpactedTests({
      changedKeys: ["tavangary-core"],
      allTestFiles: ["wpdev-crm-artifact.test.mjs"],
      mode: "affected",
    });
  }, /does not exist in tests directory/);
});
