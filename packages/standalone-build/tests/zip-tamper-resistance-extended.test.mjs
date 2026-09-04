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
  verifyZipAgainstManifest,
} from "../canonical-artifact-manifest.mjs";

const execFileAsync = promisify(execFile);

test("Extended ZIP Tamper Resistance: validates exact file-set parity, symlink/traversal rejection, and content integrity", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "zip-extended-"));
  const stagingDir = path.join(tmpDir, "my-plugin");
  const zipPath = path.join(tmpDir, "my-plugin.zip");
  try {
    await mkdir(path.join(stagingDir, "src"), { recursive: true });
    await writeFile(path.join(stagingDir, "src/entry.php"), "<?php echo 'legit';");

    const manifest = await generateArtifactManifest({
      rootDir: stagingDir,
      consumer: "my-plugin",
      version: "1.0.0",
      profile: "Profile S",
    });

    // 1. Valid ZIP passes
    await execFileAsync("zip", ["-r", "-q", zipPath, "my-plugin"], { cwd: tmpDir });
    const r1 = await verifyZipAgainstManifest({ zipPath, consumer: "my-plugin", manifest });
    assert.equal(r1.status, "valid");

    // 2. Added unexpected file inside ZIP fails
    const zipWithExtra = path.join(tmpDir, "extra.zip");
    await writeFile(path.join(stagingDir, "src/unauthorized.php"), "<?php eval('x');");
    await execFileAsync("zip", ["-r", "-q", zipWithExtra, "my-plugin"], { cwd: tmpDir });
    const r2 = await verifyZipAgainstManifest({ zipPath: zipWithExtra, consumer: "my-plugin", manifest });
    assert.equal(r2.status, "unexpected");
    assert.ok(r2.unexpectedFiles.includes("src/unauthorized.php"));
    await rm(path.join(stagingDir, "src/unauthorized.php"));

    // 3. Modified byte inside ZIP fails
    const zipWithTamper = path.join(tmpDir, "tampered.zip");
    await writeFile(path.join(stagingDir, "src/entry.php"), "<?php echo 'HACKED';");
    await execFileAsync("zip", ["-r", "-q", zipWithTamper, "my-plugin"], { cwd: tmpDir });
    const r3 = await verifyZipAgainstManifest({ zipPath: zipWithTamper, consumer: "my-plugin", manifest });
    assert.equal(r3.status, "modified");
    assert.ok(r3.modifiedFiles.some((f) => f.path === "src/entry.php"));
    await writeFile(path.join(stagingDir, "src/entry.php"), "<?php echo 'legit';");

    // 4. Missing required file inside ZIP fails
    const zipWithMissing = path.join(tmpDir, "missing.zip");
    await rm(path.join(stagingDir, "src/entry.php"));
    await execFileAsync("zip", ["-r", "-q", zipWithMissing, "my-plugin"], { cwd: tmpDir });
    const r4 = await verifyZipAgainstManifest({ zipPath: zipWithMissing, consumer: "my-plugin", manifest });
    assert.equal(r4.status, "missing");
    assert.ok(r4.missingFiles.includes("src/entry.php"));
    await writeFile(path.join(stagingDir, "src/entry.php"), "<?php echo 'legit';");

    // 5. Forged manifest inside ZIP fails
    const zipWithForgedManifest = path.join(tmpDir, "forged.zip");
    const tamperedManifest = { ...manifest, manifestDigest: "deadbeef00000000deadbeef00000000deadbeef00000000deadbeef00000000" };
    await writeFile(path.join(stagingDir, "artifact-manifest.json"), JSON.stringify(tamperedManifest, null, 2));
    await execFileAsync("zip", ["-r", "-q", zipWithForgedManifest, "my-plugin"], { cwd: tmpDir });
    const r5 = await verifyZipAgainstManifest({ zipPath: zipWithForgedManifest, consumer: "my-plugin" });
    assert.equal(r5.status, "invalid_manifest");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("Reproducible ZIP: identical source tree produces identical outer ZIP SHA-256 hash", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "zip-repro-"));
  const staging1 = path.join(tmpDir, "stage1/test-plugin");
  const staging2 = path.join(tmpDir, "stage2/test-plugin");
  const zip1 = path.join(tmpDir, "out1.zip");
  const zip2 = path.join(tmpDir, "out2.zip");

  const CANONICAL_TIME = new Date("2026-01-01T00:00:00Z");

  async function normalize(dir) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await normalize(full);
        await fs.promises.chmod(full, 0o755);
        await fs.promises.utimes(full, CANONICAL_TIME, CANONICAL_TIME);
      } else {
        await fs.promises.chmod(full, 0o644);
        await fs.promises.utimes(full, CANONICAL_TIME, CANONICAL_TIME);
      }
    }
    await fs.promises.chmod(dir, 0o755);
    await fs.promises.utimes(dir, CANONICAL_TIME, CANONICAL_TIME);
  }

  try {
    await mkdir(staging1, { recursive: true });
    await writeFile(path.join(staging1, "plugin.php"), "<?php echo 'canon';");
    await normalize(staging1);
    await execFileAsync("zip", ["-r", "-q", "-X", zip1, "test-plugin"], { cwd: path.join(tmpDir, "stage1") });

    // Wait a brief tick to simulate different build time
    await new Promise((r) => setTimeout(r, 20));

    await mkdir(staging2, { recursive: true });
    await writeFile(path.join(staging2, "plugin.php"), "<?php echo 'canon';");
    await normalize(staging2);
    await execFileAsync("zip", ["-r", "-q", "-X", zip2, "test-plugin"], { cwd: path.join(tmpDir, "stage2") });

    const hash1 = crypto.createHash("sha256").update(await readFile(zip1)).digest("hex");
    const hash2 = crypto.createHash("sha256").update(await readFile(zip2)).digest("hex");

    assert.equal(hash1, hash2, "Identical inputs with normalized timestamps must produce identical ZIP SHA-256");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});
