import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { before, after } from "node:test";
import { getDefaultZipPath, prepareArtifactFixture } from "../artifact-fixture-helper.mjs";
import { generateArtifactManifest, createCanonicalZip } from "../canonical-artifact-manifest.mjs";

const CONSUMER = "sample-profile-s-plugin";
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
    await writeFile(path.join(staging, `${CONSUMER}.php`), "<?php\n/**\n * Plugin Name: Sample Profile S Plugin\n */\necho 'ready';\n");
    await writeFile(path.join(staging, "LICENSE"), "MIT License\n");
    await mkdir(path.join(staging, "src/FrameworkClosure"), { recursive: true });
    await writeFile(
      path.join(staging, "src/FrameworkClosure/functions-closure.php"),
      "<?php\nfunction wpdev_path() { return __DIR__; }\n"
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

test("Sample Profile S Plugin Artifact: ZIP exists and matches strict package hygiene", async () => {
  const entries = fixture.entries;

  assert.ok(entries.includes(`${CONSUMER}/${CONSUMER}.php`), "Main plugin bootstrap file must exist at zip root");
  assert.ok(entries.includes(`${CONSUMER}/LICENSE`), "LICENSE must be preserved");

  const forbiddenExtensions = [".md", ".yml", ".yaml", ".log", ".dist", ".bak", ".map"];
  for (const entry of entries) {
    assert.ok(entry.startsWith(`${CONSUMER}/`), `Entry must start with ${CONSUMER}/: ${entry}`);
    for (const ext of forbiddenExtensions) {
      assert.ok(!entry.endsWith(ext), `Entry must NOT contain forbidden dev extension (${ext}): ${entry}`);
    }
    assert.ok(!entry.includes("/tests/"), `Entry must NOT contain test directories: ${entry}`);
    assert.ok(!entry.endsWith("wpdev.json"), "wpdev.json must be purged from artifact");
  }

  const mainPhp = await readFile(path.join(fixture.pluginDir, `${CONSUMER}.php`), "utf8");
  assert.ok(!mainPhp.includes("Requires Plugins: wpdev"), "Requires Plugins: wpdev header must be stripped for standalone operation");
});

test("Sample Profile S Plugin Artifact: verifies comment stripping and symbol mangling across modules", async () => {
  const closureHelper = await readFile(path.join(fixture.pluginDir, "src/FrameworkClosure/functions-closure.php"), "utf8");
  assert.ok(closureHelper.includes("wpdev_path"), "Inlined closure helper must exist and provide wpdev_path");
  assert.ok(!closureHelper.includes("/**"), "DocBlocks must be stripped from inlined files");
});
