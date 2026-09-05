import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parseAssembleCli } from "../assemble-profile-s-candidate.mjs";
import { parsePipelineArgs } from "../build-all-standalone-plugins.mjs";
import {
  assertEligibilityAllowsObfuscation,
  assertSymbolMapHasNoCollisions,
  assertZipHasNoSecretIntermediates,
  collectFirstPartyPhpFiles,
  collectToolchainEvidence,
  parseClosedProfileFlags,
  parseTransformerBatchLog,
  requireRectorForProfileS,
  validatePhpSyntaxTree,
} from "../profile-s-fail-closed.mjs";

test("parseClosedProfileFlags accepts --obfuscate and --profile=s as Profile S", () => {
  assert.deepEqual(parseClosedProfileFlags(["--obfuscate"]), { profile: "s", isObfuscate: true });
  assert.deepEqual(parseClosedProfileFlags(["--profile=s"]), { profile: "s", isObfuscate: true });
  assert.deepEqual(parseClosedProfileFlags(["--obfuscate", "--profile=s"]), { profile: "s", isObfuscate: true });
  assert.deepEqual(parseClosedProfileFlags([]), { profile: "clean", isObfuscate: false });
  assert.deepEqual(parseClosedProfileFlags(["--profile=clean"]), { profile: "clean", isObfuscate: false });
});

test("parseClosedProfileFlags rejects unknown and conflicting profiles", () => {
  assert.throws(() => parseClosedProfileFlags(["--profile=a"]), /Invalid --profile 'a'/);
  assert.throws(() => parseClosedProfileFlags(["--profile=profile-s"]), /Invalid --profile/);
  assert.throws(() => parseClosedProfileFlags(["--profile"]), /value is required/);
  assert.throws(
    () => parseClosedProfileFlags(["--obfuscate", "--profile=clean"]),
    /Conflicting profile flags/,
  );
});

test("parsePipelineArgs exposes the closed profile and rejects unknown values", () => {
  assert.equal(parsePipelineArgs(["node", "build", "--obfuscate"]).profile, "s");
  assert.equal(parsePipelineArgs(["node", "build", "--profile=s"]).isObfuscate, true);
  assert.equal(parsePipelineArgs(["node", "build"]).profile, "clean");
  assert.throws(() => parsePipelineArgs(["node", "build", "--profile=b"]), /Invalid --profile 'b'/);
});

test("requireRectorForProfileS fails closed when the binary or config is missing", () => {
  assert.throws(
    () => requireRectorForProfileS({ rectorBin: "/no/rector", rectorConfig: "/no/config.php" }),
    /Profile S requires Rector/,
  );
});

test("parseTransformerBatchLog requires valid JSON records for every expected PHP file", () => {
  assert.throws(() => parseTransformerBatchLog(""), /empty stdout/);
  assert.throws(() => parseTransformerBatchLog("not-json"), /did not emit valid JSON/);
  assert.throws(() => parseTransformerBatchLog("{}"), /must be an array/);
  assert.throws(() => parseTransformerBatchLog("[]"), /array is empty/);
  assert.throws(
    () => parseTransformerBatchLog(JSON.stringify([{ ok: true }])),
    /missing file path/,
  );

  const files = ["/tmp/a.php", "/tmp/b.php"];
  const log = JSON.stringify([{ file: files[0] }, { file: files[1] }]);
  const parsed = parseTransformerBatchLog(log, { expectedFiles: files });
  assert.equal(parsed.length, 2);

  assert.throws(
    () => parseTransformerBatchLog(JSON.stringify([{ file: files[0] }]), { expectedFiles: files }),
    /omitted 1 PHP file/,
  );
});

test("validatePhpSyntaxTree rejects leftover PHP 8 tokens after a skipped downgrade", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "php74-scan-"));
  try {
    await writeFile(
      path.join(tmpDir, "legacy.php"),
      "<?php\nfunction hello($name) { return $name; }\n",
    );
    await validatePhpSyntaxTree(tmpDir);

    await writeFile(
      path.join(tmpDir, "enum.php"),
      "<?php\nenum Status { case Open; case Closed; }\n",
    );
    await assert.rejects(
      () => validatePhpSyntaxTree(tmpDir),
      /PHP 7\.4 incompatibility: T_ENUM|syntax error/i,
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("assemble and orchestrator CLIs resolve the same closed profile with both --profile=s and --profile s", () => {
  const assembleEqual = parseAssembleCli(["node", "assemble", "/tmp/wp-content", "demo", "/tmp/dist", "--obfuscate"]);
  const pipelineEqual = parsePipelineArgs(["node", "build", "--obfuscate"]);
  assert.equal(assembleEqual.profile, "s");
  assert.equal(assembleEqual.isObfuscate, true);
  assert.equal(pipelineEqual.profile, assembleEqual.profile);
  assert.equal(pipelineEqual.isObfuscate, assembleEqual.isObfuscate);

  const assembleSpace = parseAssembleCli(["node", "assemble", "/tmp/wp-content", "demo", "/tmp/dist", "--profile", "s"]);
  assert.equal(assembleSpace.profile, "s");
  assert.equal(assembleSpace.isObfuscate, true);
  assert.equal(assembleSpace.contentRoot, path.resolve("/tmp/wp-content"));
  assert.equal(assembleSpace.consumer, "demo");
  assert.equal(assembleSpace.outputDir, path.resolve("/tmp/dist"));
  assert.equal(assembleSpace.pluginsDirArg, null);

  const pipelineSpace = parsePipelineArgs(["node", "build", "--profile", "clean"]);
  assert.equal(pipelineSpace.profile, "clean");
  assert.equal(pipelineSpace.isObfuscate, false);
});

test("assertEligibilityAllowsObfuscation fails closed on critical eval/code injection but records non-critical dynamic edges", () => {
  assert.throws(
    () =>
      assertEligibilityAllowsObfuscation({
        forbiddenPatterns: [{ file: "src/a.php", pattern: "eval", message: "x" }],
      }),
    /eval/,
  );
  assert.throws(
    () =>
      assertEligibilityAllowsObfuscation({
        forbiddenPatterns: [{ file: "src/a.php", pattern: "preg_replace_e", message: "x" }],
      }),
    /preg_replace_e/,
  );
  const recorded = assertEligibilityAllowsObfuscation({
    forbiddenPatterns: [
      { file: "src/a.php", pattern: "dynamic_callable", message: "x" },
      { file: "src/b.php", pattern: "dynamic_include", message: "y" },
      { file: "src/c.php", pattern: "reflection", message: "z" },
    ],
  });
  assert.equal(recorded.length, 3);
  assert.equal(recorded[0].pattern, "dynamic_callable");
  assert.equal(recorded[1].pattern, "dynamic_include");
  assert.equal(recorded[2].pattern, "reflection");
});

test("assertSymbolMapHasNoCollisions rejects two FQCNs or functions that share a mangled name", () => {
  assert.equal(
    assertSymbolMapHasNoCollisions({
      classes: { "App\\A\\Box": "_c_aaaa", "\\App\\A\\Box": "\\_c_aaaa", "App\\B\\Crate": "_c_bbbb" },
      functions: { "App\\funcA": "_f_1111", "App\\funcB": "_f_2222" },
    }),
    4,
  );
  assert.throws(
    () =>
      assertSymbolMapHasNoCollisions({
        classes: { "App\\A\\Box": "_c_dead", "App\\B\\Crate": "_c_dead" },
      }),
    /symbol map collision in classes/,
  );
  assert.throws(
    () =>
      assertSymbolMapHasNoCollisions({
        functions: { "App\\funcA": "_f_dead", "App\\funcB": "_f_dead" },
      }),
    /symbol map collision in functions/,
  );
});

test("assertSymbolMapHasNoCollisions enforces PHP case-insensitivity for classes and functions", () => {
  assert.throws(
    () =>
      assertSymbolMapHasNoCollisions({
        classes: { "App\\A\\Box": "_c_aaaa", "App\\B\\Crate": "_c_AAAA" },
      }),
    /symbol map collision in classes.*both mangle to _c_AAAA/,
  );
  assert.throws(
    () =>
      assertSymbolMapHasNoCollisions({
        functions: { "App\\funcA": "_f_1111", "App\\funcB": "_f_1111" },
      }),
    /symbol map collision in functions.*both mangle to _f_1111/,
  );
  assert.throws(
    () =>
      assertSymbolMapHasNoCollisions({
        functions: { "App\\funcA": "_f_aaaa", "App\\funcB": "_f_AAAA" },
      }),
    /symbol map collision in functions.*both mangle to _f_AAAA/,
  );
});

test("assertSymbolMapHasNoCollisions rejects ambiguous short names mapped to a single symbol", () => {
  assert.throws(
    () =>
      assertSymbolMapHasNoCollisions({
        classes: {
          "App\\A\\User": "_c_1111",
          "App\\B\\User": "_c_2222",
          User: "_c_1111",
        },
      }),
    /ambiguous short name 'User' belongs to multiple FQCNs and cannot be mapped/,
  );
});

test("assertZipHasNoSecretIntermediates rejects symbol map variants", () => {
  assertZipHasNoSecretIntermediates([{ name: "demo/src/a.php" }]);
  assert.throws(
    () => assertZipHasNoSecretIntermediates([{ name: "demo/symbol-map.json" }]),
    /secret build intermediate/,
  );
  assert.throws(
    () => assertZipHasNoSecretIntermediates([{ name: "demo/symbols.json" }]),
    /secret build intermediate/,
  );
  assert.throws(
    () => assertZipHasNoSecretIntermediates([{ name: "demo/symbol_map.json" }]),
    /secret build intermediate/,
  );
});

test("collectToolchainEvidence records valid version strings with digits for php/node/zip/composer", async () => {
  const evidence = await collectToolchainEvidence();
  assert.equal(typeof evidence.node, "string");
  assert.match(evidence.node, /v\d+\.\d+/);
  assert.match(evidence.php, /\d+\.\d+/);
  assert.match(evidence.zip, /\d+\.\d+/);
  assert.match(evidence.unzip, /\d+\.\d+/);
  assert.match(evidence.composer, /\d+\.\d+/);
});

test("collectFirstPartyPhpFiles skips vendor trees", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "php-collect-"));
  try {
    await mkdir(path.join(tmpDir, "src"), { recursive: true });
    await mkdir(path.join(tmpDir, "vendor/pkg"), { recursive: true });
    await writeFile(path.join(tmpDir, "src/a.php"), "<?php\n");
    await writeFile(path.join(tmpDir, "vendor/pkg/b.php"), "<?php\n");
    const files = collectFirstPartyPhpFiles(tmpDir);
    assert.equal(files.length, 1);
    assert.equal(path.basename(files[0]), "a.php");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});
