import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createDeployReceiptRecord, RECEIPT_SCHEMA_VERSION, validateDeployReceiptRecord } from '../build-cache-engine.mjs';
import { verifyArtifactManifest } from '../canonical-artifact-manifest.mjs';

test('Docker/Deploy Receipt Binding: mismatch between receipt manifestDigest and actual plugin tree is detected', async () => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'test-receipt-binding-'));
  const pluginDir = path.join(tmpDir, 'test-plugin');
  await fs.promises.mkdir(pluginDir, { recursive: true });
  await fs.promises.writeFile(path.join(pluginDir, 'test-plugin.php'), '<?php echo "OK";');

  const { generateArtifactManifest } = await import('../canonical-artifact-manifest.mjs');
  const manifest = await generateArtifactManifest({
    rootDir: pluginDir,
    consumer: 'test-plugin',
  });

  const receipt = createDeployReceiptRecord({
    artifactId: 'test-plugin-profile-s',
    consumer: 'test-plugin',
    targetPath: pluginDir,
    zipSha256: 'a'.repeat(64),
    manifestDigest: manifest.manifestDigest,
    sourceFingerprint: 'src1',
    wpdevFingerprint: 'wp1',
    toolsFingerprint: 'tool1',
    themeFingerprint: 'theme1',
    toolchainFingerprint: 'tc1',
    compositeFingerprint: 'comp1',
    validationState: 'deployed',
  });

  assert.equal(receipt.schemaVersion, RECEIPT_SCHEMA_VERSION);
  assert.equal(receipt.manifestDigest, manifest.manifestDigest);
  assert.equal(validateDeployReceiptRecord({
    receipt,
    consumer: 'test-plugin',
    zipSha256: 'a'.repeat(64),
    manifestDigest: manifest.manifestDigest,
    compositeFingerprint: 'comp1',
  }).valid, true);

  // 1. Matches deployed disk
  const diskVerify = await verifyArtifactManifest({ rootDir: pluginDir, consumer: 'test-plugin' });
  assert.equal(diskVerify.status, 'valid');
  assert.equal(diskVerify.manifestDigest, receipt.manifestDigest);

  // 2. Modified file on disk creates manifest digest mismatch
  await fs.promises.writeFile(path.join(pluginDir, 'test-plugin.php'), '<?php echo "TAMPERED";');
  const diskVerifyTampered = await verifyArtifactManifest({ rootDir: pluginDir, consumer: 'test-plugin' });
  assert.notEqual(diskVerifyTampered.status, 'valid');

  // 3. Receipt with altered manifestDigest does not match disk
  const forgedReceipt = { ...receipt, manifestDigest: 'forged_digest_hex' };
  assert.notEqual(forgedReceipt.manifestDigest, manifest.manifestDigest);
  assert.equal(validateDeployReceiptRecord({ receipt: forgedReceipt, consumer: 'test-plugin' }).valid, false);

  await fs.promises.rm(tmpDir, { recursive: true, force: true });
});
