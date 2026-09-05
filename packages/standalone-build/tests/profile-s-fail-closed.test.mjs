import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parsePipelineArgs } from "../build-all-standalone-plugins.mjs";
import {
  collectFirstPartyPhpFiles,
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
