import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  shouldPurgeDirectory,
  shouldPurgeFile,
  purgeDevelopmentTree,
  getRsyncExcludeArgs,
  ROOT_DEV_DIRS
} from "../dev-purge-policy.mjs";

test("Dev Purge Policy: shouldPurgeDirectory correctly identifies root vs nested production directories", () => {
  // Root level checks
  assert.equal(shouldPurgeDirectory("tests", true, "tests"), true, "Root 'tests' must be purged");
  assert.equal(shouldPurgeDirectory("unit-tests", true, "unit-tests"), true, "Root 'unit-tests' must be purged");
  assert.equal(shouldPurgeDirectory("dev", true, "dev"), true, "Root 'dev' must be purged");
  assert.equal(shouldPurgeDirectory("docs", true, "docs"), true, "Root 'docs' must be purged");
  assert.equal(shouldPurgeDirectory("src", true, "src"), false, "Root 'src' must NOT be purged");
  assert.equal(shouldPurgeDirectory("assets", true, "assets"), false, "Root 'assets' must NOT be purged");

  // Production nested checks - MUST NEVER BE PURGED even if name contains 'tests' / 'test' in any casing
  assert.equal(
    shouldPurgeDirectory("src/Modules/OnlineTest/Tests", false, "Tests"),
    false,
    "src/Modules/OnlineTest/Tests must NEVER be purged"
  );
  assert.equal(
    shouldPurgeDirectory("src/Modules/OnlineTest/tests", false, "tests"),
    false,
    "src/Modules/OnlineTest/tests (lowercase) must NEVER be purged"
  );
  assert.equal(
    shouldPurgeDirectory("src/Modules/OnlineTest/TESTS", false, "TESTS"),
    false,
    "src/Modules/OnlineTest/TESTS (uppercase) must NEVER be purged"
  );
  assert.equal(
    shouldPurgeDirectory("src/Modules/OnlineTest/Test", false, "Test"),
    false,
    "src/Modules/OnlineTest/Test must NEVER be purged"
  );
  assert.equal(
    shouldPurgeDirectory("src/Modules/OnlineTest/Testing", false, "Testing"),
    false,
    "src/Modules/OnlineTest/Testing must NEVER be purged"
  );
  assert.equal(
    shouldPurgeDirectory("src/Modules/OnlineTest/Docs", false, "Docs"),
    false,
    "src/Modules/OnlineTest/Docs must NEVER be purged"
  );
  assert.equal(
    shouldPurgeDirectory("src/Modules/OnlineTest/Dev", false, "Dev"),
    false,
    "src/Modules/OnlineTest/Dev must NEVER be purged"
  );

  // Vendor dev tools checks
  assert.equal(
    shouldPurgeDirectory("vendor/phpunit", false, "phpunit"),
    true,
    "vendor/phpunit must be purged"
  );
  assert.equal(
    shouldPurgeDirectory("vendor/phpstan", false, "phpstan"),
    true,
    "vendor/phpstan must be purged"
  );
  assert.equal(
    shouldPurgeDirectory("vendor/rector", false, "rector"),
    true,
    "vendor/rector must be purged"
  );
});

test("Dev Purge Policy: shouldPurgeFile correctly identifies dev configs and keeps license/notice", () => {
  assert.deepEqual(shouldPurgeFile("README.md", "README.md"), { purge: true, action: "delete" });
  assert.deepEqual(shouldPurgeFile("LICENSE.md", "LICENSE.md"), { purge: false, action: "keep" });
  assert.deepEqual(shouldPurgeFile("NOTICE.md", "NOTICE.md"), { purge: false, action: "keep" });
  assert.deepEqual(shouldPurgeFile("wpdev.json", "wpdev.json"), { purge: true, action: "migrate_config" });
  assert.deepEqual(shouldPurgeFile("composer.json", "composer.json"), { purge: true, action: "delete" });
  assert.deepEqual(shouldPurgeFile("composer.lock", "composer.lock"), { purge: true, action: "delete" });
  assert.deepEqual(shouldPurgeFile("app.js.map", "app.js.map"), { purge: true, action: "delete" });
  assert.deepEqual(shouldPurgeFile("phpunit.xml", "phpunit.xml"), { purge: true, action: "delete" });
  assert.deepEqual(shouldPurgeFile("src/Main.php", "Main.php"), { purge: false, action: "keep" });
});

test("Dev Purge Policy: getRsyncExcludeArgs returns root-anchored flags", () => {
  const flags = getRsyncExcludeArgs();
  assert.ok(flags.includes("--exclude=/tests"), "Must contain --exclude=/tests with leading slash");
  assert.ok(flags.includes("--exclude=/unit-tests"), "Must contain --exclude=/unit-tests with leading slash");
  assert.ok(flags.includes("--exclude=/dev"), "Must contain --exclude=/dev with leading slash");
  assert.ok(flags.includes("--exclude=/docs"), "Must contain --exclude=/docs with leading slash");
  for (const flag of flags) {
    assert.ok(flag.startsWith("--exclude=/"), `Flag must be root-anchored with leading slash: ${flag}`);
  }
});

test("Dev Purge Policy: purgeDevelopmentTree executes on nested fixture preserving production Tests", async () => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "purge-tree-test-"));
  const pluginDir = path.join(tmpDir, "my-plugin");

  // Create simulated structure
  await mkdir(path.join(pluginDir, "tests"), { recursive: true });
  await writeFile(path.join(pluginDir, "tests/SampleUnitTest.php"), "<?php");

  await mkdir(path.join(pluginDir, "src/Modules/OnlineTest/Tests/Scorers"), { recursive: true });
  await writeFile(path.join(pluginDir, "src/Modules/OnlineTest/Tests/TestRegistry.php"), "<?php class TestRegistry {}");
  await writeFile(path.join(pluginDir, "src/Modules/OnlineTest/Tests/Scorers/HeroScorer.php"), "<?php class HeroScorer {}");

  await mkdir(path.join(pluginDir, "src/Modules/DocsModule/Docs"), { recursive: true });
  await writeFile(path.join(pluginDir, "src/Modules/DocsModule/Docs/DocManager.php"), "<?php class DocManager {}");

  await writeFile(path.join(pluginDir, "wpdev.json"), '{"name":"my-plugin"}');
  await writeFile(path.join(pluginDir, "README.md"), "# Readme");
  await writeFile(path.join(pluginDir, "LICENSE"), "MIT License");

  try {
    await purgeDevelopmentTree(pluginDir, "my-plugin");

    // Dev root tests purged
    assert.equal(fs.existsSync(path.join(pluginDir, "tests")), false, "Root tests directory must be purged");
    assert.equal(fs.existsSync(path.join(pluginDir, "README.md")), false, "README.md must be purged");

    // Config migrated
    assert.equal(fs.existsSync(path.join(pluginDir, "project.config.json")), true, "wpdev.json must be migrated to project.config.json");
    assert.equal(fs.existsSync(path.join(pluginDir, "wpdev.json")), false, "wpdev.json must be removed after migration");
    assert.equal(fs.existsSync(path.join(pluginDir, "LICENSE")), true, "LICENSE must be preserved");

    // Production namespaces preserved
    assert.equal(
      fs.existsSync(path.join(pluginDir, "src/Modules/OnlineTest/Tests/TestRegistry.php")),
      true,
      "src/Modules/OnlineTest/Tests/TestRegistry.php must be PRESERVED"
    );
    assert.equal(
      fs.existsSync(path.join(pluginDir, "src/Modules/OnlineTest/Tests/Scorers/HeroScorer.php")),
      true,
      "src/Modules/OnlineTest/Tests/Scorers/HeroScorer.php must be PRESERVED"
    );
    assert.equal(
      fs.existsSync(path.join(pluginDir, "src/Modules/DocsModule/Docs/DocManager.php")),
      true,
      "src/Modules/DocsModule/Docs/DocManager.php must be PRESERVED"
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});
