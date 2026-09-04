import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { mkdtemp, rm, writeFile, mkdir, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { prepareArtifactFixture } from "../artifact-fixture-helper.mjs";

test("ArtifactFixtureHelper: rejects non-existent and symlink ZIP files", async () => {
  await assert.rejects(
    async () => {
      await prepareArtifactFixture({ consumer: "test-plugin", zipPath: "/non/existent/path.zip" });
    },
    /does not exist/i
  );

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "fixture-test-"));
  try {
    const realFile = path.join(tmpDir, "real.zip");
    await writeFile(realFile, "DUMMY_ZIP_DATA");
    const linkFile = path.join(tmpDir, "link.zip");
    await symlink(realFile, linkFile);

    await assert.rejects(
      async () => {
        await prepareArtifactFixture({ consumer: "test-plugin", zipPath: linkFile });
      },
      /must be a regular file, not a symlink/i
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("ArtifactFixtureHelper: customStagingRoot is strictly preserved and only owned subdirectories are deleted", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "custom-staging-"));
  try {
    const callerMarker = path.join(tmpDir, "caller-precious-file.txt");
    await writeFile(callerMarker, "DO_NOT_DELETE", "utf8");

    const dummyZip = path.join(tmpDir, "corrupted.zip");
    await writeFile(dummyZip, Buffer.alloc(2000, 0x5a));

    await assert.rejects(
      async () => {
        await prepareArtifactFixture({
          consumer: "test-plugin",
          zipPath: dummyZip,
          customStagingRoot: tmpDir,
        });
      },
      /Central directory not found|ZIP/i
    );

    // Verify caller root and caller's marker file are 100% intact!
    assert.ok(fs.existsSync(tmpDir), "Caller customStagingRoot must NOT be deleted");
    assert.ok(fs.existsSync(callerMarker), "Caller files inside customStagingRoot must NOT be deleted");
    assert.equal(await fs.promises.readFile(callerMarker, "utf8"), "DO_NOT_DELETE");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("ArtifactFixtureHelper: pre-extraction abort signal prevents extraction and cleans temp", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "abort-fixture-"));
  try {
    const realZip = path.resolve("dist/tavangary-core-profile-s.zip");
    if (!fs.existsSync(realZip)) return; // Skip if dist not present

    const controller = new AbortController();
    controller.abort();

    await assert.rejects(
      async () => {
        await prepareArtifactFixture({
          consumer: "tavangary-core",
          zipPath: realZip,
          customStagingRoot: tmpDir,
          signal: controller.signal,
        });
      },
      /aborted/i
    );

    // Verify no leftover directories inside customStagingRoot
    const entries = await fs.promises.readdir(tmpDir);
    assert.equal(entries.length, 0, "No orphaned staging directories should remain after abort");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});
