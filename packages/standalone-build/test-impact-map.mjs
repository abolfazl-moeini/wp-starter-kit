#!/usr/bin/env node

/**
 * Test Impact Mapping Engine
 *
 * Maps source/tool changes to the precise minimum set of affected test suites.
 */

import path from "node:path";
import {
  TEST_DEPENDENCY_GRAPH,
  TEST_SPEC_MAP,
  REQUIRED_ARTIFACT_TESTS,
  CANONICAL_TEST_REGISTRY,
  validateCanonicalTestRegistry,
} from "./test-dependency-registry.mjs";

export {
  TEST_DEPENDENCY_GRAPH,
  TEST_SPEC_MAP,
  REQUIRED_ARTIFACT_TESTS,
  CANONICAL_TEST_REGISTRY,
  validateCanonicalTestRegistry,
};

export const BASELINE_HEALTH_TESTS = [
  "atomic-deploy-and-cache-integrity.test.mjs",
  "dev-purge-policy.test.mjs",
  "transformer-correctness-matrix.test.mjs",
];

export const CONTRACT_TESTS = [
  "settings-field-inventory.test.mjs",
  "validate-settings-ownership-review.test.mjs",
  "validate-hook-contract-review.test.mjs",
  "validate-hook-contract-dynamic-domain.test.mjs",
  "validate-template-resolver-contract.test.mjs",
  "validate-closure-review-manifest.test.mjs",
  "transformer-correctness-matrix.test.mjs",
];

export const ARTIFACT_TESTS = [
  "tavangary-core-artifact.test.mjs",
  "tavangary-theme-panel-artifact.test.mjs",
  "wpdev-crm-artifact.test.mjs",
  "wpdev-tickets-artifact.test.mjs",
  "verify-profile-s-artifact.test.mjs",
  "artifact-manifest-tamper-resistance.test.mjs",
  "zip-tamper-resistance-extended.test.mjs",
];

export const ALLOWED_MODES = new Set([
  "affected",
  "fast",
  "contract",
  "artifact",
  "full",
  "release",
  "docker-smoke",
]);

export function resolveImpactedTests({
  changedKeys = [],
  allTestFiles = [],
  mode = "affected",
}) {
  if (!ALLOWED_MODES.has(mode)) {
    throw new Error(`Invalid test mode '${mode}'. Allowed modes: ${Array.from(ALLOWED_MODES).join(", ")}`);
  }

  if (mode === "full" || mode === "release") {
    return {
      selected: [...allTestFiles],
      skipped: [],
      reason: `Full test run requested (mode=${mode})`,
    };
  }

  if (mode === "docker-smoke") {
    return {
      selected: ["docker-runtime-smoke.test.mjs"],
      skipped: allTestFiles,
      reason: "Docker smoke suite requested",
    };
  }

  if (mode === "fast") {
    const selectedSet = new Set(BASELINE_HEALTH_TESTS);
    const selected = allTestFiles.filter((f) => selectedSet.has(f));
    const skipped = allTestFiles.filter((f) => !selectedSet.has(f));
    return {
      selected,
      skipped,
      reason: "Fast test suite requested",
    };
  }

  if (mode === "contract") {
    const selectedSet = new Set(CONTRACT_TESTS);
    const selected = allTestFiles.filter((f) => selectedSet.has(f));
    const skipped = allTestFiles.filter((f) => !selectedSet.has(f));
    return {
      selected,
      skipped,
      reason: "Contract test suite requested",
    };
  }

  if (mode === "artifact") {
    const selectedSet = new Set(ARTIFACT_TESTS);
    const selected = allTestFiles.filter((f) => selectedSet.has(f));
    const skipped = allTestFiles.filter((f) => !selectedSet.has(f));
    return {
      selected,
      skipped,
      reason: "Artifact test suite requested",
    };
  }

  // mode === "affected"
  const selectedSet = new Set();

  if (changedKeys.length === 0) {
    // Zero changes: run baseline health tests
    for (const t of BASELINE_HEALTH_TESTS) {
      if (allTestFiles.includes(t)) {
        selectedSet.add(t);
      }
    }
  } else {
    for (const key of changedKeys) {
      // If the changed key is a direct test file name
      if (key.endsWith(".test.mjs") && allTestFiles.includes(key)) {
        selectedSet.add(key);
        continue;
      }

      const mapped = TEST_DEPENDENCY_GRAPH[key];
      if (mapped) {
        for (const t of mapped) {
          if (allTestFiles.includes(t)) {
            selectedSet.add(t);
          } else {
            throw new Error(`Mapped test file '${t}' for key '${key}' does not exist in tests directory (fail-closed)`);
          }
        }
      } else {
        // Unknown key: fallback to full tests for safety
        return {
          selected: [...allTestFiles],
          skipped: [],
          reason: `Unknown changed key '${key}': fallback to full suite`,
        };
      }
    }
  }

  const selected = allTestFiles.filter((f) => selectedSet.has(f));
  const skipped = allTestFiles.filter((f) => !selectedSet.has(f));

  return {
    selected,
    skipped,
    reason: `Impact map resolved ${selected.length} tests for changed targets: [${changedKeys.join(", ") || "none"}]`,
  };
}
