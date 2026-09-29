#!/usr/bin/env node
/**
 * The `migration` parity command required by the plan's §6 acceptance:
 *
 *   "A separate `migration` parity command runs the oracles and the Go binary or
 *    library on the same fixtures (dual-run, byte diff), independent of `go test`."
 *
 * What it does, in order:
 *   1. Regenerates the parity vectors from the FROZEN NODE SOURCES.
 *   2. Fails if the regenerated vectors differ from the committed testdata —
 *      this is the drift gate: it catches a Node-side change that the Go tests
 *      would not notice, because the Go tests read the committed file.
 *   3. Runs the Go parity tests, which compare the Go implementation against
 *      those recorded Node outputs.
 *
 * `go test ./...` stays free of Node and of the monorepo layout; this command is
 * where the two sides actually meet.
 *
 * Usage: node migration/parity/run-parity.mjs
 * Exit:  0 = Node and Go agree on every recorded vector; 1 = drift or mismatch.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const goDir = resolve(repo, "packages/build-go");

const VECTOR_FILES = [
  "packages/build-go/internal/phpencode/testdata/parity-vectors.json",
  "packages/build-go/internal/sidecar/testdata/parity-vectors.json",
  "packages/build-go/internal/hash/testdata/parity-vectors.json",
];

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });
}

/** `go` is frequently absent from PATH in agent shells even when installed. */
function goBinary() {
  const candidates = [
    process.env.WPDEV_GO_BIN,
    "/opt/homebrew/bin/go",
    "/usr/local/go/bin/go",
    "go",
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      execFileSync(c, ["version"], { stdio: "ignore" });
      return c;
    } catch {
      /* try the next candidate */
    }
  }
  throw new Error("no working `go` binary found; set WPDEV_GO_BIN to the absolute path");
}

let failed = false;
const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  failed = true;
};

// ---------------------------------------------------------------- 1. baseline
const before = new Map();
for (const f of VECTOR_FILES) {
  before.set(f, readFileSync(resolve(repo, f), "utf8"));
}

// ------------------------------------------------- 2. regenerate from Node
console.log("== regenerating parity vectors from the frozen Node sources ==");
try {
  const out = run("node", ["migration/fixtures/emit-parity-vectors.mjs"]);
  process.stdout.write(out);
} catch (e) {
  fail(`vector emitter failed: ${e.stderr || e.message}`);
}

// ------------------------------------------------------------ 3. drift check
console.log("== drift check: committed testdata vs regenerated ==");
for (const f of VECTOR_FILES) {
  const after = readFileSync(resolve(repo, f), "utf8");
  if (before.get(f) === after) {
    console.log(`  unchanged  ${f}`);
  } else {
    fail(
      `${f} changed when regenerated from Node. The committed vectors were stale ` +
        `relative to the frozen sources. Review the diff, then commit the new vectors.`,
    );
  }
}

// ------------------------------------------------------ 4. dual-run: Go side
console.log("== dual-run: Go implementation vs recorded Node output ==");
const go = goBinary();
try {
  const out = run(go, ["test", "-count=1", "-run", "TestParityVectors", "-v", "./..."], { cwd: goDir });
  const lines = out.split("\n").filter((l) => /^(ok|FAIL|---)/.test(l) || /mismatch|oracle=/.test(l));
  process.stdout.write(`${lines.join("\n")}\n`);
} catch (e) {
  process.stdout.write(`${e.stdout || ""}${e.stderr || ""}\n`);
  fail("Go parity tests failed against the recorded Node vectors");
}

console.log(failed ? "\nPARITY FAILED" : "\nPARITY OK");
process.exit(failed ? 1 : 0);
