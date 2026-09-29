#!/usr/bin/env node
/**
 * §1.6 fixture vectors for computePlanFingerprint (build-plan.mjs).
 * Emits (plan input, canonicalJson text, sha256) pairs. Run before any
 * U02 production code; Go must reproduce these bytes.
 */
import assert from "node:assert/strict";
import { canonicalJson, computePlanFingerprint } from "../../packages/standalone-build/build-plan.mjs";

const vectors = [
  { consumer: "pilot", capabilities: {}, targetPhp: "7.4" },
  { consumer: "pilot", capabilities: { inlineFramework: true }, targetPhp: "7.4", preservationPolicy: { frozenClasses: [], frozenFunctions: [] } },
  { consumer: "pilot", capabilities: { inlineFramework: true, spaghetti: true, obfuscate: true }, targetPhp: "8.1", preservationPolicy: { frozenClasses: ["B", "A"], gettextDomains: ["t\u2028x"] } },
  { consumer: "pilot", capabilities: {}, targetPhp: "7.4", assetPolicy: { minifyAssets: true }, source: { frameworkProvider: null } },
];

for (const v of vectors) {
  const fp = computePlanFingerprint(v);
  assert.match(fp, /^[0-9a-f]{64}$/);
  console.log(JSON.stringify({ input: v, sha256: fp }));
}
// Spot-check canonicalJson value rules (not valid-JSON inputs included).
assert.equal(canonicalJson(undefined), "null");
assert.equal(canonicalJson([1, undefined, 2]), "[1,null,2]");
console.log("plan-fingerprint vectors OK");
