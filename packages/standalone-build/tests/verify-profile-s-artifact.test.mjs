import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { verifyProfileSArtifact } from "../verify-profile-s-artifact.mjs";

test("verifies that the assembled Profile S ZIP passes all black-box execution probes", async () => {
  const consumers = ["tavangary-theme-panel", "drm-connector", "wpdev-analytics", "wpdev-woo-persian"];
  for (const consumer of consumers) {
    const zipPath = path.resolve(`dist/${consumer}-profile-s.zip`);
    if (fs.existsSync(zipPath)) {
      const report = await verifyProfileSArtifact({
        zipPath,
        consumer,
      });

      assert.equal(report.status, "passed", `Profile S artifact for ${consumer} must pass all verification probes`);
      assert.equal(report.testsFailed, 0, `Zero probes should fail for ${consumer}`);
      assert.ok(report.testsPassed >= 4, `All core black-box probes must pass for ${consumer}`);
      assert.deepEqual(report.failures, []);
    }
  }
});

test("Profile S verifier refuses extraction when ZIP preflight fails", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "verify-preflight-"));
  const zipPath = path.join(tmpDir, "not-a-zip.zip");
  try {
    await writeFile(zipPath, "this is not a zip archive");
    const report = await verifyProfileSArtifact({
      zipPath,
      consumer: "tavangary-theme-panel",
    });
    assert.notEqual(report.status, "passed");
    const message = JSON.stringify(report);
    assert.match(message, /end-of-central-directory|no end-of-central|unsafe|failed/i);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});
