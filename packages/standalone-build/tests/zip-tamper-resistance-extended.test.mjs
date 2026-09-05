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
  readZipEntries,
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

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let bit = 0; bit < 8; bit += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data) {
  let value = 0xffffffff;
  for (const byte of data) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function u16(n) {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(n);
  return buf;
}

function u32(n) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(n);
  return buf;
}

function buildStoredZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data || "");
    const crc = crc32(data);
    const unixMode = file.unixMode ?? 0o100644;
    const local = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      data,
    ]);
    const central = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x01, 0x02]),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32((unixMode << 16) >>> 0),
      u32(offset),
      name,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const localBuf = Buffer.concat(locals);
  const centralBuf = Buffer.concat(centrals);
  const eocd = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x05, 0x06]),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralBuf.length),
    u32(localBuf.length),
    u16(0),
  ]);
  return Buffer.concat([localBuf, centralBuf, eocd]);
}

test("readZipEntries hashes inflated payloads and rejects traversal, absolute, symlink, and duplicate names before extract", () => {
  const payload = Buffer.from("<?php echo 'ok';");
  const safe = buildStoredZip([{ name: "my-plugin/src/entry.php", data: payload }]);
  const entries = readZipEntries(safe);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].sha256, crypto.createHash("sha256").update(payload).digest("hex"));

  const traversal = buildStoredZip([{ name: "../escape.php", data: payload }]);
  assert.throws(() => readZipEntries(traversal), /unsafe entry path/);

  const absolute = buildStoredZip([{ name: "/tmp/escape.php", data: payload }]);
  assert.throws(() => readZipEntries(absolute), /unsafe entry path/);

  const symlinkZip = buildStoredZip([{ name: "my-plugin/link.php", data: payload, unixMode: 0o120777 }]);
  assert.throws(() => readZipEntries(symlinkZip), /symlink/);

  const duplicate = buildStoredZip([
    { name: "my-plugin/a.php", data: payload },
    { name: "my-plugin/a.php", data: payload },
  ]);
  assert.throws(() => readZipEntries(duplicate), /duplicate/);
});

test("verifyZipAgainstManifest detects a payload digest mismatch without extracting", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "zip-payload-hash-"));
  try {
    const staging = path.join(tmpDir, "my-plugin");
    await mkdir(path.join(staging, "src"), { recursive: true });
    await writeFile(path.join(staging, "src/entry.php"), "<?php echo 'legit';");
    const manifest = await generateArtifactManifest({
      rootDir: staging,
      consumer: "my-plugin",
      profile: "Profile S",
    });

    const original = Buffer.from("<?php echo 'legit';");
    const tampered = Buffer.from("<?php echo 'HACKED';");
    const zipPath = path.join(tmpDir, "tampered.zip");
    await writeFile(
      zipPath,
      buildStoredZip([
        { name: "my-plugin/src/entry.php", data: tampered },
        {
          name: "my-plugin/artifact-manifest.json",
          data: Buffer.from(JSON.stringify(manifest)),
        },
      ]),
    );

    const report = await verifyZipAgainstManifest({
      zipPath,
      consumer: "my-plugin",
      manifest,
    });
    assert.equal(report.status, "modified");
    assert.ok(report.modifiedFiles.some((file) => file.path === "src/entry.php"));
    assert.notEqual(
      report.modifiedFiles[0].actualSha,
      crypto.createHash("sha256").update(original).digest("hex"),
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});
