#!/usr/bin/env node
/**
 * Emits machine-checkable parity vectors from the FROZEN NODE SOURCES.
 *
 * Why this exists: `run-u01-oracle.mjs` and `run-u06-sidecar-oracle.mjs` are
 * Node-asserts-Node characterization scripts. They never execute Go, so the Go
 * side was previously locked only by hand-written `want` strings in Go tests —
 * exactly the drift the plan forbids ("assert the Go encoder against that
 * output, not against a hand-written want string alone").
 *
 * This script derives the vectors from the live Node sources and writes them
 * into each Go package's `testdata/`. The Go tests then consume the committed
 * JSON, so `go test ./...` stays free of Node AND of the monorepo layout.
 * `migration/parity/run-parity.mjs` re-runs this and fails on drift.
 *
 * Usage: node migration/fixtures/emit-parity-vectors.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  phpFileContent,
  generateChecksum,
  assetFilePath,
} from "../../core/packages/dependency-extraction-esbuild-plugin/index.js";
import { canonicalJson, computePlanFingerprint } from "../../packages/standalone-build/build-plan.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const goTestdata = (pkg) => resolve(repo, "packages/build-go/internal", pkg, "testdata");

/**
 * Tagged value encoding. Big integers MUST travel as strings so the Go side can
 * build a json.Number and perform the binary64 rounding itself — that rounding
 * is the behaviour under test (R-004e), so it cannot happen in the emitter.
 */
const t = {
  s: (v) => ({ t: "s", v }),
  f: (v) => ({ t: "f", v }),
  n: (v) => ({ t: "n", v }), // json.Number from decimal string
  b: (v) => ({ t: "b", v }),
  nul: () => ({ t: "null" }),
  arr: (v) => ({ t: "arr", v }),
  // Non-finite floats need their own tags: JSON.stringify(NaN) is "null", so a
  // {"t":"f","v":NaN} vector would silently arrive as null on the Go side and
  // pass without ever exercising the non-finite path (R-004d).
  nan: () => ({ t: "nan" }),
  inf: () => ({ t: "inf" }),
  ninf: () => ({ t: "ninf" }),
};

/** Ordered phpencode.Object as [key, taggedValue] pairs. */
const obj = (pairs) => ({ pairs });

// ---------------------------------------------------------------- U06 vectors
// Inputs chosen to cover R-004e (binary64 rounding), R-002d (object order),
// R-004d (non-finite -> null) and the string-escaping rules.
const phpCases = [
  ["hash-only", obj([["hash", t.s("abc")]])],
  ["asset-sidecar", obj([
    ["dependencies", t.arr([t.s("wp-element"), t.s("jquery")])],
    ["internal_packages", t.arr([])],
    ["hash", t.s("deadbeef")],
  ])],
  ["escaped-quote", obj([["hash", t.s("a'b")]])],
  ["escaped-backslash", obj([["hash", t.s("a\\b")]])],
  ["bools-and-null", obj([["ok", t.b(true)], ["no", t.b(false)], ["z", t.nul()]])],
  ["numbers", obj([["n", t.f(1)], ["f", t.f(1.5)]])],
  // §1.1 / R-004e — the P0 case. uint64 max and 2^53+1 must round like JSON.parse.
  ["uint64-max", obj([["max", t.n("18446744073709551615")]])],
  ["two-pow-53-plus-1", obj([["n", t.n("9007199254740993")]])],
  ["int64-max", obj([["n", t.n("9223372036854775807")]])],
  ["negative-zero", obj([["z", t.n("-0.0")]])],
  // R-002c — array-index keys enumerate numerically before other string keys.
  ["array-index-order", obj([
    ["z", t.s("first")], ["10", t.s("ten")], ["2", t.s("two")],
    ["a", t.s("last")], ["0", t.s("zero")],
  ])],
  ["nonfinite-array", obj([["n", t.arr([t.nan(), t.inf(), t.ninf(), t.f(1.5)])]])],
  ["root-nonfinite", obj([["n", t.nan()]])],
];

/** Rebuild the JS value the emitter used, so Node is the oracle for the bytes. */
function toJS(v) {
  switch (v.t) {
    case "s": return v.v;
    case "f": return v.v;
    case "n": return Number(v.v); // JSON.parse-equivalent rounding, deliberately
    case "b": return v.v;
    case "null": return null;
    case "nan": return NaN;
    case "inf": return Infinity;
    case "ninf": return -Infinity;
    case "arr": return v.v.map(toJS);
    default: throw new Error(`unknown tag ${v.t}`);
  }
}
function pairsToJS(pairs) {
  return Object.fromEntries(pairs.map(([k, v]) => [k, toJS(v)]));
}

const phpVectors = phpCases.map(([name, value]) => ({
  name,
  object: value,
  // Node is the oracle: these bytes come from the frozen source, not from a hand-written string.
  want: phpFileContent(pairsToJS(value.pairs)),
}));

// ------------------------------------------------------------- sidecar vectors
const assetPathInputs = [
  "assets/bundles/wpdev-starter-deps.js",
  "assets/bundles/style.css",
  "style.css",
  "dir/bundle.js/",
  "style.css/",
  "/",
  "noext",
  "",
];
const assetPathVectors = assetPathInputs.map((input) => {
  try {
    return { input, want: assetFilePath(input), err: false };
  } catch (e) {
    return { input, want: "", err: true, errorName: e.constructor.name };
  }
});

const md5Inputs = ["", "hello", "سلام"];
const md5Vectors = md5Inputs.map((input) => ({ input, want: generateChecksum(input) }));

// ------------------------------------------------------- canonicalJson vectors
// Only values that survive a JSON text round-trip participate in parity: the Go
// entry point is hash.CanonicalJSON([]byte), i.e. a JSON *text* canonicalizer.
// The sparse-array case is recorded separately because it does NOT round-trip.
const planCases = [
  ["empty-object", {}],
  ["null-value", { a: null }],
  ["nested", { b: [1, 2, { c: true }], a: "x" }],
  ["non-ascii-key", { "ключ": 1, "a": 2 }],
  ["u2028-literal", { k: "t\u2028x" }],
  ["boundary-1e20", { n: 1e20 }],
  ["boundary-1e21", { n: 1e21 }],
  ["boundary-1e-6", { n: 1e-6 }],
  ["boundary-1e-7", { n: 1e-7 }],
  ["negative-zero", { n: -0 }],
  ["empty-array", []],
];
const planVectors = planCases.map(([name, value]) => ({
  name,
  // JSON.stringify is the transport; the Go side parses this text.
  json: JSON.stringify(value),
  want: canonicalJson(value),
}));

// Recorded, not asserted as parity: canonicalJson is a VALUE function, so it can
// see inputs that JSON text cannot carry. Both cases below are unreachable on the
// Go side (hash.CanonicalJSON takes []byte) and must be handled by the U02 port
// explicitly rather than discovered later.
const valueOnlyFindings = [
  {
    name: "sparse-array",
    note: "canonicalJson preserves array holes, producing text that is not valid JSON. Unreachable via a JSON-text round-trip.",
    input: "[1,,2]",
    canonicalJson: canonicalJson([1, , 2]),
    jsonStringify: JSON.stringify([1, , 2]),
    parses: (() => { try { JSON.parse(canonicalJson([1, , 2])); return true; } catch { return false; } })(),
  },
  {
    name: "undefined-object-value",
    note: "JSON.stringify DROPS a key whose value is undefined; canonicalJson KEEPS it as null. A U02 port that canonicalizes json.Marshal output cannot reproduce this — computePlanFingerprint passes planData.consumer straight through, so an absent consumer must render as \"consumer\":null, not as an omitted key.",
    input: "{a: undefined}",
    canonicalJson: canonicalJson({ a: undefined }),
    jsonStringify: JSON.stringify({ a: undefined }),
    parses: (() => { try { JSON.parse(canonicalJson({ a: undefined })); return true; } catch { return false; } })(),
  },
];

const fingerprintVectors = [
  { consumer: "pilot", capabilities: {}, targetPhp: "7.4" },
  { consumer: "pilot", capabilities: { inlineFramework: true }, targetPhp: "7.4", preservationPolicy: { frozenClasses: [], frozenFunctions: [] } },
  { consumer: "pilot", capabilities: { inlineFramework: true, spaghetti: true, obfuscate: true }, targetPhp: "8.1", preservationPolicy: { frozenClasses: ["B", "A"], gettextDomains: ["t\u2028x"] } },
  { consumer: "pilot", capabilities: {}, targetPhp: "7.4", assetPolicy: { minifyAssets: true }, source: { frameworkProvider: null } },
].map((input) => ({ input, sha256: computePlanFingerprint(input) }));

// ----------------------------------------------------------------------- write
function emit(pkg, filename, payload) {
  const dir = goTestdata(pkg);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, filename), `${JSON.stringify(payload, null, 2)}\n`);
  return `packages/build-go/internal/${pkg}/testdata/${filename}`;
}

const written = [
  emit("phpencode", "parity-vectors.json", {
    generatedBy: "migration/fixtures/emit-parity-vectors.mjs",
    oracle: "core/packages/dependency-extraction-esbuild-plugin/index.js",
    rule: "R-004e",
    vectors: phpVectors,
  }),
  emit("sidecar", "parity-vectors.json", {
    generatedBy: "migration/fixtures/emit-parity-vectors.mjs",
    oracle: "core/packages/dependency-extraction-esbuild-plugin/utils.js",
    rule: "R-008d",
    assetPath: assetPathVectors,
    md5: md5Vectors,
  }),
  emit("hash", "parity-vectors.json", {
    generatedBy: "migration/fixtures/emit-parity-vectors.mjs",
    oracle: "packages/standalone-build/build-plan.mjs",
    rule: "R-005d",
    canonicalJson: planVectors,
    valueOnlyFindings,
    fingerprints: fingerprintVectors,
  }),
];

for (const p of written) console.log(`wrote ${p}`);
console.log("emit-parity-vectors OK");
