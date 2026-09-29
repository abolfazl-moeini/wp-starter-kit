import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { purgeDevelopmentTree } from "../dev-purge-policy.mjs";

test("Regression: purge policy must preserve nested production namespaces like src/Modules/OnlineTest/Tests and purge only dev test suites", async () => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "purge-policy-test-"));
  const fixtureDir = path.join(tmpDir, "sample-plugin");

  // Create simulated structure
  await mkdir(path.join(fixtureDir, "tests"), { recursive: true });
  await writeFile(path.join(fixtureDir, "tests/SampleUnitTest.php"), "<?php // unit test");

  await mkdir(path.join(fixtureDir, "unit-tests"), { recursive: true });
  await writeFile(path.join(fixtureDir, "unit-tests/AnotherTest.php"), "<?php // unit test");

  await mkdir(path.join(fixtureDir, "dev"), { recursive: true });
  await writeFile(path.join(fixtureDir, "dev/dev-script.js"), "// dev tool");

  await mkdir(path.join(fixtureDir, "src/Modules/OnlineTest/Tests/Scorers"), { recursive: true });
  await writeFile(path.join(fixtureDir, "src/Modules/OnlineTest/Tests/TestRegistry.php"), "<?php namespace TavangaryCore\\Modules\\OnlineTest\\Tests; class TestRegistry {}");
  await writeFile(path.join(fixtureDir, "src/Modules/OnlineTest/Tests/Scorers/HeroScorer.php"), "<?php namespace TavangaryCore\\Modules\\OnlineTest\\Tests\\Scorers; class HeroScorer {}");

  try {
    await purgeDevelopmentTree(fixtureDir, "sample-plugin");

    // Assert that development directories are purged
    assert.equal(fs.existsSync(path.join(fixtureDir, "tests")), false, "Root 'tests' directory must be purged");
    assert.equal(fs.existsSync(path.join(fixtureDir, "unit-tests")), false, "Root 'unit-tests' directory must be purged");
    assert.equal(fs.existsSync(path.join(fixtureDir, "dev")), false, "Root 'dev' directory must be purged");

    // Assert that production namespaces named 'Tests' under src/ are STRICTLY PRESERVED
    assert.equal(
      fs.existsSync(path.join(fixtureDir, "src/Modules/OnlineTest/Tests/TestRegistry.php")),
      true,
      "CRITICAL: src/Modules/OnlineTest/Tests/TestRegistry.php must NOT be purged by the build tool!"
    );
    assert.equal(
      fs.existsSync(path.join(fixtureDir, "src/Modules/OnlineTest/Tests/Scorers/HeroScorer.php")),
      true,
      "CRITICAL: src/Modules/OnlineTest/Tests/Scorers/HeroScorer.php must NOT be purged by the build tool!"
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});
