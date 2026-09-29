import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { generateSignedReleaseManifest } from "../generate-signed-release-manifest.mjs";
import { validateSignedReleaseManifest } from "../validate-signed-release-manifest.mjs";

function generateKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const rawPublic = publicKey.export({ type: "spki", format: "der" }).subarray(-32).toString("hex");
  const rawPrivate = privateKey.export({ type: "pkcs8", format: "der" }).subarray(-32).toString("hex");
  return { rawPublic, rawPrivate };
}

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-manifest-test-"));
  await mkdir(path.join(root, "src"), { recursive: true });
  await mkdir(path.join(root, "assets"), { recursive: true });

  await writeFile(path.join(root, "plugin.php"), "<?php // Plugin bootstrap", "utf8");
  await writeFile(path.join(root, "src/Module.php"), "<?php class Module {}", "utf8");
  await writeFile(path.join(root, "assets/style.css"), "body { color: red; }", "utf8");

  const keys = generateKeys();
  const keyring = { "release-key-1": keys.rawPublic };

  await generateSignedReleaseManifest({
    rootDir: root,
    artifactId: "test-plugin-001",
    version: "1.0.0",
    privateKeyHex: keys.rawPrivate,
    keyId: "release-key-1",
  });

  return { root, keys, keyring };
}

test("accepts a valid signed release manifest matching all disk files", async () => {
  const { root, keyring } = await createFixture();
  try {
    const report = await validateSignedReleaseManifest({ rootDir: root, keyring });
    assert.equal(report.status, "ready");
    assert.deepEqual(report.failures, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects when a file content has been tampered with", async () => {
  const { root, keyring } = await createFixture();
  try {
    await writeFile(path.join(root, "src/Module.php"), "<?php // Tampered content", "utf8");
    const report = await validateSignedReleaseManifest({ rootDir: root, keyring });
    assert.equal(report.status, "blocked");
    assert.ok(report.failures.some((f) => f.includes("Digest mismatch for src/Module.php")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects when an expected file is missing from disk", async () => {
  const { root, keyring } = await createFixture();
  try {
    await rm(path.join(root, "assets/style.css"));
    const report = await validateSignedReleaseManifest({ rootDir: root, keyring });
    assert.equal(report.status, "blocked");
    assert.ok(report.failures.some((f) => f.includes("Missing file on disk: assets/style.css")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects when an unlisted file is present on disk", async () => {
  const { root, keyring } = await createFixture();
  try {
    await writeFile(path.join(root, "src/Extra.php"), "<?php // Unlisted", "utf8");
    const report = await validateSignedReleaseManifest({ rootDir: root, keyring });
    assert.equal(report.status, "blocked");
    assert.ok(report.failures.some((f) => f.includes("Unlisted file found on disk: src/Extra.php")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects when signature is signed by an untrusted/unknown key", async () => {
  const { root, keys } = await createFixture();
  try {
    const wrongKeyring = { "other-key": keys.rawPublic };
    const report = await validateSignedReleaseManifest({ rootDir: root, keyring: wrongKeyring });
    assert.equal(report.status, "blocked");
    assert.ok(report.failures.some((f) => f.includes("Unknown key ID")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects when the manifest signature is forged/corrupted", async () => {
  const { root, keyring } = await createFixture();
  try {
    const manifestPath = path.join(root, "release-manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.signature = "a".repeat(128); // invalid signature
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

    const report = await validateSignedReleaseManifest({ rootDir: root, keyring });
    assert.equal(report.status, "blocked");
    assert.ok(report.failures.some((f) => f.includes("signature verification failed")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects symlinked files on disk", async () => {
  const { root, keyring } = await createFixture();
  try {
    await rm(path.join(root, "assets/style.css"));
    const outside = path.join(root, "..", "target-css");
    await writeFile(outside, "body{}", "utf8");
    await symlink(outside, path.join(root, "assets/style.css"));

    const report = await validateSignedReleaseManifest({ rootDir: root, keyring });
    assert.equal(report.status, "blocked");
    assert.ok(report.failures.some((f) => f.includes("Symlinks are forbidden")));
    await rm(outside, { force: true });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
