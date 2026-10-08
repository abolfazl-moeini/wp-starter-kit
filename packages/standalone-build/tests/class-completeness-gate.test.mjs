import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

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
    "<?php namespace SampleStandalone\\Modules\\OnlineTest\\Tests; class TestRegistry {}"
  );

  // Staging does NOT have TestRegistry
  await mkdir(path.join(stagingPlugin, "src"), { recursive: true });

  try {
    let errorCaught = false;
    try {
      await validateClassCompleteness({
        devDir,
        stagingPlugin,
        consumer: "sample-standalone-plugin"
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

test("Class Completeness Gate: registry requiredFqcns fails when the file remains but the class does not", async () => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "class-gate-required-"));
  const devDir = path.join(tmpDir, "dev-plugin");
  const stagingPlugin = path.join(tmpDir, "staging-plugin");
  const source = "<?php namespace Sample\\Gate; class Required {}";
  await mkdir(path.join(devDir, "src/Gate"), { recursive: true });
  await mkdir(path.join(stagingPlugin, "src/Gate"), { recursive: true });
  await writeFile(path.join(devDir, "src/Gate/Required.php"), source);
  await writeFile(path.join(stagingPlugin, "src/Gate/Required.php"), "<?php namespace Sample\\Gate; class Renamed {}");
  try {
    const withoutRegistry = await validateClassCompleteness({
      devDir,
      stagingPlugin,
      consumer: "sample-plugin",
    });
    assert.equal(withoutRegistry.status, "OK");
    await assert.rejects(
      validateClassCompleteness({
        devDir,
        stagingPlugin,
        consumer: "sample-plugin",
        registry: { "sample-plugin": { requiredFqcns: ["Sample\\Gate\\Required"] } },
      }),
      /Required class Sample\\Gate\\Required missing from staging/,
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("assemble passes the loaded registry, not the empty legacy registry, into the class completeness gate", async () => {
  const source = await readFile(fileURLToPath(new URL("../assemble-profile-s-candidate.mjs", import.meta.url)), "utf8");
  const pipeline = await readFile(fileURLToPath(new URL("../build-all-standalone-plugins.mjs", import.meta.url)), "utf8");
  assert.match(source, /const completenessRegistry = options\.registry \|\| TARGET_REGISTRY/);
  assert.match(source, /validateClassCompleteness\(\{\s*devDir,\s*stagingPlugin,\s*consumer,\s*registry:\s*completenessRegistry\s*\}\)/);
  assert.match(pipeline, /assembleProfileSCandidate\(\{[\s\S]*?registry:\s*effectiveRegistry/);
});
