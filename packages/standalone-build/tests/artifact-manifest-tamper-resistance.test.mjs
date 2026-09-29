import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  generateArtifactManifest,
  verifyArtifactManifest,
  canonicalizeJson,
  computeManifestDigest,
} from "../canonical-artifact-manifest.mjs";

const execFileAsync = promisify(execFile);

test("scanDisk treats planted symlinks as unexpected rather than ignoring them", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "manifest-symlink-scan-"));
  try {
    await mkdir(path.join(tmpDir, "src"), { recursive: true });
    await writeFile(path.join(tmpDir, "src/index.php"), "<?php echo 1;");
    const manifest = await generateArtifactManifest({
      rootDir: tmpDir,
      consumer: "sample-plugin",
      profile: "Profile S",
    });
    await writeFile(path.join(tmpDir, "artifact-manifest.json"), JSON.stringify(manifest, null, 2));
    await symlink(path.join(tmpDir, "src/index.php"), path.join(tmpDir, "planted.php"));

    const report = await verifyArtifactManifest({ rootDir: tmpDir, consumer: "sample-plugin" });
    assert.notEqual(report.status, "valid", "Planted symlink must fail integrity verification");
    const flagged = [...(report.unexpectedFiles || []), ...(report.blockers || [])].join(" ");
    assert.match(flagged, /planted\.php|symlink/i);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("manifest verifier rejects forged identity, digest metadata, type flags, and sizes", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "manifest-structure-"));
  try {
    await writeFile(path.join(tmpDir, "sample-plugin.php"), "<?php echo 'ok';");
    const original = await generateArtifactManifest({ rootDir: tmpDir, consumer: "sample-plugin" });

    const variants = [
      { ...original, consumer: "other-plugin" },
      { ...original, artifactId: "other-plugin-profile-s" },
      { ...original, files: [{ ...original.files[0], sha256: "abc" }] },
      { ...original, files: [{ ...original.files[0], size: -1 }] },
      { ...original, files: [{ ...original.files[0], isSymlink: true }] },
    ];
    for (const variant of variants) {
      variant.manifestDigest = computeManifestDigest(variant);
      await writeFile(path.join(tmpDir, "artifact-manifest.json"), JSON.stringify(variant));
      const report = await verifyArtifactManifest({ rootDir: tmpDir, consumer: "sample-plugin" });
      assert.equal(report.status, "invalid_manifest");
    }

    const wrongPhysicalSize = structuredClone(original);
    wrongPhysicalSize.files[0].size += 1;
    wrongPhysicalSize.manifestDigest = computeManifestDigest(wrongPhysicalSize);
    await writeFile(path.join(tmpDir, "artifact-manifest.json"), JSON.stringify(wrongPhysicalSize));
    const sizeReport = await verifyArtifactManifest({ rootDir: tmpDir, consumer: "sample-plugin" });
    assert.equal(sizeReport.status, "modified");
    assert.equal(sizeReport.modifiedFiles[0].actualSize, original.files[0].size);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("1. manifest generation is deterministic for a fixed fixture", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "manifest-det-"));
  try {
    await mkdir(path.join(tmpDir, "src"), { recursive: true });
    await writeFile(path.join(tmpDir, "src/index.php"), "<?php echo 1;");
    await writeFile(path.join(tmpDir, "readme.txt"), "Plugin readme");

    const m1 = await generateArtifactManifest({
      rootDir: tmpDir,
      consumer: "tavangary-core",
      version: "1.0.0",
      profile: "Profile S",
    });

    const m2 = await generateArtifactManifest({
      rootDir: tmpDir,
      consumer: "tavangary-core",
      version: "1.0.0",
      profile: "Profile S",
    });

    assert.equal(m1.manifestDigest, m2.manifestDigest);
    assert.deepEqual(m1.files, m2.files);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("2. modifying a single byte in a production file results in modified status", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "manifest-mod-"));
  try {
    await mkdir(path.join(tmpDir, "src"), { recursive: true });
    await writeFile(path.join(tmpDir, "src/service.php"), "<?php return 'original';");

    await generateArtifactManifest({
      rootDir: tmpDir,
      consumer: "tavangary-core",
      version: "1.0.0",
      profile: "Profile S",
    });

    // Tamper with one byte
    await writeFile(path.join(tmpDir, "src/service.php"), "<?php return 'tampered';");

    const report = await verifyArtifactManifest({ rootDir: tmpDir });
    assert.equal(report.status, "modified");
    assert.ok(report.modifiedFiles.some((f) => f.path === "src/service.php"));
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("3. deleting a production file results in missing status", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "manifest-del-"));
  try {
    await mkdir(path.join(tmpDir, "src"), { recursive: true });
    await writeFile(path.join(tmpDir, "src/service.php"), "<?php return 'original';");
    await writeFile(path.join(tmpDir, "src/helper.php"), "<?php return 'helper';");

    await generateArtifactManifest({
      rootDir: tmpDir,
      consumer: "tavangary-core",
      version: "1.0.0",
      profile: "Profile S",
    });

    // Delete one file
    await rm(path.join(tmpDir, "src/helper.php"), { force: true });

    const report = await verifyArtifactManifest({ rootDir: tmpDir });
    assert.equal(report.status, "missing");
    assert.ok(report.missingFiles.includes("src/helper.php"));
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("4. adding an unexpected file results in unexpected status", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "manifest-add-"));
  try {
    await mkdir(path.join(tmpDir, "src"), { recursive: true });
    await writeFile(path.join(tmpDir, "src/service.php"), "<?php return 'original';");

    await generateArtifactManifest({
      rootDir: tmpDir,
      consumer: "tavangary-core",
      version: "1.0.0",
      profile: "Profile S",
    });

    // Add unlisted payload file
    await writeFile(path.join(tmpDir, "src/backdoor.php"), "<?php eval($_POST['x']);");

    const report = await verifyArtifactManifest({ rootDir: tmpDir });
    assert.equal(report.status, "unexpected");
    assert.ok(report.unexpectedFiles.includes("src/backdoor.php"));
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("5. reordering input file lists does not change canonical digest", async () => {
  const payloadA = {
    schemaVersion: 1,
    consumer: "tavangary-core",
    files: [
      { path: "b.php", sha256: "222", size: 20 },
      { path: "a.php", sha256: "111", size: 10 },
    ],
  };
  const payloadB = {
    consumer: "tavangary-core",
    schemaVersion: 1,
    files: [
      { path: "a.php", sha256: "111", size: 10 },
      { path: "b.php", sha256: "222", size: 20 },
    ],
  };

  const d1 = computeManifestDigest(payloadA);
  const d2 = computeManifestDigest(payloadB);
  assert.equal(d1, d2, "Canonical digest must be invariant under key and array permutation");
});

test("6. symlinks in production tree are rejected during manifest generation and verification", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "manifest-symlink-"));
  try {
    await mkdir(path.join(tmpDir, "src"), { recursive: true });
    await writeFile(path.join(tmpDir, "src/real.php"), "<?php return 1;");
    await symlink(path.join(tmpDir, "src/real.php"), path.join(tmpDir, "src/link.php"));

    let threw = false;
    try {
      await generateArtifactManifest({
        rootDir: tmpDir,
        consumer: "tavangary-core",
        version: "1.0.0",
        profile: "Profile S",
      });
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes("Symbolic links are forbidden") || err.message.includes("symlink"));
    }
    assert.equal(threw, true, "generateArtifactManifest must reject symlinks");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("7. path traversal entries are rejected during verification", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "manifest-traversal-"));
  try {
    await mkdir(path.join(tmpDir, "src"), { recursive: true });
    await writeFile(path.join(tmpDir, "src/index.php"), "<?php return 1;");

    const forgedManifest = {
      schemaVersion: 1,
      consumer: "tavangary-core",
      files: [
        { path: "../../../etc/passwd", sha256: "abc", size: 100 },
        { path: "src/index.php", sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", size: 16 },
      ],
    };
    await writeFile(path.join(tmpDir, "artifact-manifest.json"), JSON.stringify(forgedManifest, null, 2));

    const report = await verifyArtifactManifest({ rootDir: tmpDir });
    assert.equal(report.status, "invalid_manifest");
    assert.ok(report.blockers.some((b) => b.includes("traversal") || b.includes("Unsafe path")));
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("8. duplicate paths in manifest are rejected during verification", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "manifest-dup-"));
  try {
    await mkdir(path.join(tmpDir, "src"), { recursive: true });
    await writeFile(path.join(tmpDir, "src/index.php"), "<?php return 1;");

    const forgedManifest = {
      schemaVersion: 1,
      consumer: "tavangary-core",
      files: [
        { path: "src/index.php", sha256: "111", size: 16 },
        { path: "src/index.php", sha256: "222", size: 16 },
      ],
    };
    await writeFile(path.join(tmpDir, "artifact-manifest.json"), JSON.stringify(forgedManifest, null, 2));

    const report = await verifyArtifactManifest({ rootDir: tmpDir });
    assert.equal(report.status, "invalid_manifest");
    assert.ok(report.blockers.some((b) => b.includes("Duplicate")));
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("9. manifest file itself is omitted from file list preventing recursion and unstable hash", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "manifest-recurse-"));
  try {
    await mkdir(path.join(tmpDir, "src"), { recursive: true });
    await writeFile(path.join(tmpDir, "src/a.php"), "<?php return 'a';");

    const m = await generateArtifactManifest({
      rootDir: tmpDir,
      consumer: "tavangary-core",
      version: "1.0.0",
      profile: "Profile S",
    });

    assert.equal(m.files.some((f) => f.path.includes("artifact-manifest.json")), false);
    assert.equal(m.files.some((f) => f.path.includes("release-manifest.json")), false);

    const report = await verifyArtifactManifest({ rootDir: tmpDir });
    assert.equal(report.status, "valid");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("10. ZIP extraction and manifest parity verification passes for valid candidate", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "manifest-zip-"));
  const stagingPlugin = path.join(tmpDir, "sample-plugin");
  const zipPath = path.join(tmpDir, "sample-plugin.zip");
  try {
    await mkdir(path.join(stagingPlugin, "src"), { recursive: true });
    await writeFile(path.join(stagingPlugin, "src/service.php"), "<?php return 'active';");

    await generateArtifactManifest({
      rootDir: stagingPlugin,
      consumer: "sample-plugin",
      version: "1.0.0",
      profile: "Profile S",
    });

    await execFileAsync("zip", ["-r", "-q", zipPath, "sample-plugin"], { cwd: tmpDir });

    const report = await verifyArtifactManifest({
      rootDir: stagingPlugin,
      expectedZipPath: zipPath,
      consumer: "sample-plugin",
    });
    assert.equal(report.status, "valid");
    assert.equal(report.missingFiles.length, 0);
    assert.equal(report.unexpectedFiles.length, 0);
    assert.equal(report.modifiedFiles.length, 0);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("11. ZIP with extra or tampered entry fails verification", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "manifest-zip-fail-"));
  const stagingPlugin = path.join(tmpDir, "sample-plugin");
  const zipPath = path.join(tmpDir, "sample-plugin.zip");
  try {
    await mkdir(path.join(stagingPlugin, "src"), { recursive: true });
    await writeFile(path.join(stagingPlugin, "src/service.php"), "<?php return 'active';");

    await generateArtifactManifest({
      rootDir: stagingPlugin,
      consumer: "sample-plugin",
      version: "1.0.0",
      profile: "Profile S",
    });

    // Create zip
    await execFileAsync("zip", ["-r", "-q", zipPath, "sample-plugin"], { cwd: tmpDir });

    // Modify disk after zip
    await writeFile(path.join(stagingPlugin, "src/service.php"), "<?php return 'tampered';");

    const report = await verifyArtifactManifest({
      rootDir: stagingPlugin,
      expectedZipPath: zipPath,
      consumer: "sample-plugin",
    });
    assert.notEqual(report.status, "valid");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("12. build from two different current working directories yields identical manifest digest", async () => {
  const tmpDir1 = await mkdtemp(path.join(os.tmpdir(), "manifest-cwd1-"));
  const tmpDir2 = await mkdtemp(path.join(os.tmpdir(), "manifest-cwd2-"));
  try {
    await mkdir(path.join(tmpDir1, "src"), { recursive: true });
    await writeFile(path.join(tmpDir1, "src/main.php"), "<?php echo 'ok';");

    await mkdir(path.join(tmpDir2, "src"), { recursive: true });
    await writeFile(path.join(tmpDir2, "src/main.php"), "<?php echo 'ok';");

    const m1 = await generateArtifactManifest({
      rootDir: tmpDir1,
      consumer: "tavangary-core",
      version: "1.0.0",
      profile: "Profile S",
    });

    const m2 = await generateArtifactManifest({
      rootDir: tmpDir2,
      consumer: "tavangary-core",
      version: "1.0.0",
      profile: "Profile S",
    });

    assert.equal(m1.manifestDigest, m2.manifestDigest);
    assert.equal(m1.files[0].sha256, m2.files[0].sha256);
  } finally {
    await rm(tmpDir1, { recursive: true, force: true });
    await rm(tmpDir2, { recursive: true, force: true });
  }
});

test("13. production files named Tests like src/Modules/OnlineTest/Tests/TestRegistry.php are preserved in manifest", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "manifest-testreg-"));
  try {
    await mkdir(path.join(tmpDir, "src/Modules/OnlineTest/Tests"), { recursive: true });
    await writeFile(
      path.join(tmpDir, "src/Modules/OnlineTest/Tests/TestRegistry.php"),
      "<?php class TestRegistry {}"
    );

    const m = await generateArtifactManifest({
      rootDir: tmpDir,
      consumer: "tavangary-core",
      version: "1.0.0",
      profile: "Profile S",
    });

    assert.ok(
      m.files.some((f) => f.path === "src/Modules/OnlineTest/Tests/TestRegistry.php"),
      "TestRegistry.php MUST be recorded in production manifest"
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("14. root development files like tests/ and unit-tests/ are rejected or not present in manifest", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "manifest-dev-"));
  try {
    await mkdir(path.join(tmpDir, "src"), { recursive: true });
    await writeFile(path.join(tmpDir, "src/index.php"), "<?php echo 1;");
    await mkdir(path.join(tmpDir, "tests"), { recursive: true });
    await writeFile(path.join(tmpDir, "tests/SampleTest.php"), "<?php // test");

    let threw = false;
    try {
      await generateArtifactManifest({
        rootDir: tmpDir,
        consumer: "tavangary-core",
        version: "1.0.0",
        profile: "Profile S",
      });
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes("development") || err.message.includes("tests") || err.message.includes("forbidden"));
    }
    assert.equal(threw, true, "Root tests directory must be rejected from production manifest creation");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("15. verifier in invalid or corrupted state returns structured failure without fatal error or exception", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "manifest-safe-"));
  try {
    // Completely empty directory or corrupted JSON
    await writeFile(path.join(tmpDir, "artifact-manifest.json"), "{ invalid-json }");

    const report = await verifyArtifactManifest({ rootDir: tmpDir });
    assert.equal(report.status, "invalid_manifest");
    assert.equal(typeof report.severity, "string");
    assert.ok(Array.isArray(report.blockers));
    assert.equal(report.fatal, false);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});
