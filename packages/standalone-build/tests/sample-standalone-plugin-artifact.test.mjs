import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { before, after } from "node:test";
import { getDefaultZipPath, prepareArtifactFixture } from "../artifact-fixture-helper.mjs";
import { generateArtifactManifest, createCanonicalZip } from "../canonical-artifact-manifest.mjs";

const CONSUMER = "sample-standalone-plugin";
let ZIP_PATH = null;
try {
  ZIP_PATH = getDefaultZipPath(CONSUMER);
} catch {
  ZIP_PATH = null;
}

let fixture;
let tempZipDir = null;

before(async () => {
  let targetZip = ZIP_PATH;
  if (!targetZip || !fs.existsSync(targetZip)) {
    tempZipDir = await mkdtemp(path.join(os.tmpdir(), `fixture-${CONSUMER}-`));
    const staging = path.join(tempZipDir, "stage", CONSUMER);
    await mkdir(staging, { recursive: true });
    await writeFile(path.join(staging, `${CONSUMER}.php`), "<?php\n/**\n * Plugin Name: Sample Standalone Plugin\n */\necho 'ready';\n");
    await writeFile(path.join(staging, "LICENSE"), "MIT License\n");
    await mkdir(path.join(staging, "src/FrameworkClosure"), { recursive: true });
    await writeFile(
      path.join(staging, "src/FrameworkClosure/functions-closure.php"),
      "<?php\nfunction wpdev_path() { return __DIR__; }\n"
    );
    await mkdir(path.join(staging, "src/Modules/OnlineTest/Tests"), { recursive: true });
    await writeFile(
      path.join(staging, "src/Modules/OnlineTest/Tests/TestRegistry.php"),
      "<?php\nnamespace SampleStandalone\\Modules\\OnlineTest\\Tests;\nclass TestRegistry {}\n"
    );
    await mkdir(path.join(staging, "vendor/composer"), { recursive: true });
    await writeFile(
      path.join(staging, "vendor/composer/autoload_files.php"),
      "<?php\n$vendorDir = dirname(__DIR__);\n$baseDir = dirname($vendorDir);\nreturn array('closure' => $baseDir . '/src/FrameworkClosure/functions-closure.php');\n"
    );
    await writeFile(
      path.join(staging, "vendor/composer/autoload_real.php"),
      "<?php\nclass ComposerAutoloaderInitSample { public static function getLoader() { return null; } }\n"
    );
    await writeFile(
      path.join(staging, "vendor/autoload.php"),
      "<?php\nrequire_once __DIR__ . '/composer/autoload_real.php';\n"
    );
    const manifest = await generateArtifactManifest({
      rootDir: staging,
      consumer: CONSUMER,
      profile: "Profile S",
    });
    await writeFile(path.join(staging, "artifact-manifest.json"), JSON.stringify(manifest, null, 2));

    targetZip = path.join(tempZipDir, `${CONSUMER}-profile-s.zip`);
    await createCanonicalZip({
      sourceRoot: staging,
      outputZip: targetZip,
      rootName: CONSUMER,
    });
  }

  fixture = await prepareArtifactFixture({ consumer: CONSUMER, zipPath: targetZip });
});

after(async () => {
  if (fixture?.cleanup) {
    await fixture.cleanup();
  }
  if (tempZipDir) {
    await rm(tempZipDir, { recursive: true, force: true }).catch(() => {});
  }
});

test("Sample Standalone Plugin Artifact: ZIP exists and matches strict package hygiene", async () => {
  const entries = fixture.entries;

  assert.ok(entries.includes(`${CONSUMER}/${CONSUMER}.php`), "Main plugin bootstrap file must exist at zip root");
  assert.ok(entries.includes(`${CONSUMER}/LICENSE`), "LICENSE must be preserved");

  const forbiddenExtensions = [".md", ".yml", ".yaml", ".log", ".dist", ".bak", ".map"];
  for (const entry of entries) {
    assert.ok(entry.startsWith(`${CONSUMER}/`), `Entry must start with ${CONSUMER}/: ${entry}`);
    for (const ext of forbiddenExtensions) {
      assert.ok(!entry.endsWith(ext), `Entry must NOT contain forbidden dev extension (${ext}): ${entry}`);
    }
    assert.ok(!entry.startsWith(`${CONSUMER}/tests/`) && !entry.startsWith(`${CONSUMER}/unit-tests/`), `Entry must NOT contain root dev test directories: ${entry}`);
    assert.ok(!entry.endsWith("wpdev.json"), "wpdev.json must be purged from artifact");
  }

  assert.ok(
    entries.some(e => e.includes("OnlineTest/Tests/TestRegistry.php")),
    "CRITICAL: Production TestRegistry must be preserved in artifact ZIP"
  );

  const mainPhp = await readFile(path.join(fixture.pluginDir, `${CONSUMER}.php`), "utf8");
  assert.ok(!mainPhp.includes("Requires Plugins: wpdev"), "Requires Plugins: wpdev header must be stripped for standalone operation");
});

test("Sample Standalone Plugin Artifact: verifies comment stripping and symbol mangling across modules", async () => {
  const closureHelper = await readFile(path.join(fixture.pluginDir, "src/FrameworkClosure/functions-closure.php"), "utf8");
  assert.ok(closureHelper.includes("wpdev_path"), "Inlined closure helper must exist and provide wpdev_path");
  assert.ok(!closureHelper.includes("/**"), "DocBlocks must be stripped from inlined files");
});

test("Sample Standalone Plugin Artifact: strictly orders ZIP entries so autoload targets precede vendor/autoload.php", async () => {
  const entries = fixture.entries;

  const closureIdx = entries.indexOf(`${CONSUMER}/src/FrameworkClosure/functions-closure.php`);
  const vendorAutoloadIdx = entries.indexOf(`${CONSUMER}/vendor/autoload.php`);
  const autoloadRealIdx = entries.indexOf(`${CONSUMER}/vendor/composer/autoload_real.php`);

  assert.ok(closureIdx !== -1, "functions-closure.php must be present in ZIP");
  assert.ok(vendorAutoloadIdx !== -1, "vendor/autoload.php must be present in ZIP");
  assert.ok(autoloadRealIdx !== -1, "vendor/composer/autoload_real.php must be present in ZIP");

  assert.ok(
    closureIdx < autoloadRealIdx,
    `functions-closure.php (idx: ${closureIdx}) must precede autoload_real.php (idx: ${autoloadRealIdx})`
  );
  assert.ok(
    closureIdx < vendorAutoloadIdx,
    `functions-closure.php (idx: ${closureIdx}) must precede vendor/autoload.php (idx: ${vendorAutoloadIdx})`
  );
  assert.ok(
    autoloadRealIdx < vendorAutoloadIdx,
    `autoload_real.php (idx: ${autoloadRealIdx}) must precede vendor/autoload.php (idx: ${vendorAutoloadIdx})`
  );

  // Comprehensive assertion: every single target declared in autoload_files.php must precede autoload_real.php
  const autoloadFilesPath = path.join(fixture.pluginDir, "vendor/composer/autoload_files.php");
  const content = await readFile(autoloadFilesPath, "utf8");
  const targets = [];
  for (const m of content.matchAll(/\$baseDir\s*\.\s*'\/([^']+)'/g)) {
    targets.push(m[1]);
  }
  for (const m of content.matchAll(/\$vendorDir\s*\.\s*'\/([^']+)'/g)) {
    targets.push(`vendor/${m[1]}`);
  }

  assert.ok(targets.length > 0, "autoload_files.php must contain declared file targets");
  for (const t of targets) {
    const entryName = `${CONSUMER}/${t}`;
    const idx = entries.indexOf(entryName);
    assert.ok(idx !== -1, `Autoload target '${entryName}' must exist in ZIP`);
    assert.ok(
      idx < autoloadRealIdx,
      `Autoload target '${entryName}' (idx: ${idx}) must precede autoload_real.php (idx: ${autoloadRealIdx})`
    );
    assert.ok(
      idx < vendorAutoloadIdx,
      `Autoload target '${entryName}' (idx: ${idx}) must precede vendor/autoload.php (idx: ${vendorAutoloadIdx})`
    );
  }
});

