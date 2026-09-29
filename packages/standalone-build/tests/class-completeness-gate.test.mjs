import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { validateClassCompleteness } from "../class-completeness-gate.mjs";

test("Class Completeness Gate: passes when all source classes exist in staging", async () => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "class-gate-test-"));
  const devDir = path.join(tmpDir, "dev-plugin");
  const stagingPlugin = path.join(tmpDir, "staging-plugin");

  await mkdir(path.join(devDir, "src/Services"), { recursive: true });
  await writeFile(
    path.join(devDir, "src/Services/MyService.php"),
    "<?php namespace MyPlugin\\Services; class MyService {}"
  );

  await mkdir(path.join(stagingPlugin, "src/Services"), { recursive: true });
  await writeFile(
    path.join(stagingPlugin, "src/Services/MyService.php"),
    "<?php namespace MyPlugin\\Services; class MyService {}"
  );

  try {
    const result = await validateClassCompleteness({
      devDir,
      stagingPlugin,
      consumer: "my-plugin"
    });
    assert.equal(result.status, "OK");
    assert.equal(result.sourceClassCount, 1);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("Class Completeness Gate: fails when a source class is missing from staging", async () => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "class-gate-fail-"));
  const devDir = path.join(tmpDir, "dev-plugin");
  const stagingPlugin = path.join(tmpDir, "staging-plugin");

  await mkdir(path.join(devDir, "src/Modules/OnlineTest/Tests"), { recursive: true });
  await writeFile(
    path.join(devDir, "src/Modules/OnlineTest/Tests/TestRegistry.php"),
    "<?php namespace TavangaryCore\\Modules\\OnlineTest\\Tests; class TestRegistry {}"
  );

  // Staging does NOT have TestRegistry
  await mkdir(path.join(stagingPlugin, "src"), { recursive: true });

  try {
    let errorCaught = false;
    try {
      await validateClassCompleteness({
        devDir,
        stagingPlugin,
        consumer: "tavangary-core"
      });
    } catch (err) {
      errorCaught = true;
      assert.ok(err.message.includes("TestRegistry") || err.message.includes("Missing class file"));
    }
    assert.equal(errorCaught, true, "Gate MUST throw when TestRegistry is missing");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});
