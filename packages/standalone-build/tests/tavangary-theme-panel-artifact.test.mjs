import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test, { before, after } from "node:test";
import { prepareArtifactFixture } from "../artifact-fixture-helper.mjs";

const CONSUMER = "tavangary-theme-panel";
const ZIP_PATH = path.resolve(`dist/${CONSUMER}-profile-s.zip`);

let fixture;

before(async () => {
  fixture = await prepareArtifactFixture({ consumer: CONSUMER, zipPath: ZIP_PATH });
});

after(async () => {
  if (fixture?.cleanup) {
    await fixture.cleanup();
  }
});

test("Tavangary Theme Panel Artifact: ZIP exists and matches strict package hygiene", async () => {
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

test("Tavangary Theme Panel Artifact: verifies comment stripping and symbol mangling across modules", async () => {
  const closureHelper = await readFile(path.join(fixture.pluginDir, "src/FrameworkClosure/functions-closure.php"), "utf8");
  assert.ok(closureHelper.includes("wpdev_path"), "Inlined closure helper must exist and provide wpdev_path");
  assert.ok(!closureHelper.includes("/**"), "DocBlocks must be stripped from inlined files");
});
