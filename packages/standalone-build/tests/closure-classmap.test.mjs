import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { generateClosureClassmap, inlineWpdevClosure } from "../inline-wpdev-closure.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execFileAsync = promisify(execFile);

const SYNTHETIC_TREE = {
  "Core/Core/Plugin.php": "<?php\nnamespace FW\\Core;\nclass Plugin {}\n",
  "modules/demo/src/class-thing.php":
    "<?php\nnamespace FW\\Demo;\nclass Thing { public function t() { return 'T'; } }\n",
  "modules/demo/src/class-second.php":
    "<?php\nnamespace FW\\Demo;\nclass Second extends \\FW\\Demo\\Thing {}\n",
  "modules/demo/src/traits/trait-helper.php":
    "<?php\nnamespace FW\\Demo;\ntrait Helper { public function h() { return 1; } }\n",
  "modules/demo/src/trait-standalone.php":
    "<?php\nnamespace FW\\Demo;\ntrait Standalone {}\n",
  "modules/demo/src/traits/trait-dirty.php":
    "<?php\nnamespace FW\\Demo;\ntrait Dirty {}\necho 'side-effect';\n",
  "modules/other/src/class-thing.php":
    "<?php\nnamespace FW\\Other;\nclass Thing {}\n",
  "views/tpl.php": "<?php // <div class=\"x\"> template, no declarations\n",
};

async function writeTree(root, tree) {
  for (const [rel, content] of Object.entries(tree)) {
    const full = path.join(root, rel);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, content, "utf8");
  }
}

test("V4: generateClosureClassmap discovers declarations dynamically with zero name lists", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "v4-classmap-"));
  try {
    await writeTree(tmpDir, SYNTHETIC_TREE);
    const { map, traits, warnings } = await generateClosureClassmap(tmpDir);

    assert.deepEqual(Object.keys(map).sort(), Object.keys(map), "map keys must be sorted");
    assert.equal(map["FW\\Core\\Plugin"], "/Core/Core/Plugin.php");
    assert.equal(map["FW\\Demo\\Thing"], "/modules/demo/src/class-thing.php");
    assert.equal(map["FW\\Demo\\Second"], "/modules/demo/src/class-second.php");
    assert.equal(map["FW\\Demo\\Helper"], "/modules/demo/src/traits/trait-helper.php");
    assert.equal(map["FW\\Demo\\Standalone"], "/modules/demo/src/trait-standalone.php");
    assert.equal(map["FW\\Demo\\Dirty"], "/modules/demo/src/traits/trait-dirty.php");
    assert.equal(map["FW\\Other\\Thing"], "/modules/other/src/class-thing.php");
    assert.equal(Object.keys(map).length, 7);

    // views/ templates never enter the classmap.
    assert.ok(!Object.values(map).some((p) => p.includes("views/")), "views must be excluded");

    // Pure trait files preload (by FQCN; paths resolve through map); the side-effect
    // file is excluded with a warning.
    assert.deepEqual(traits, ["FW\\Demo\\Helper", "FW\\Demo\\Standalone"]);
    assert.ok(warnings.length > 0, "impure trait file must be reported");
    assert.ok(warnings.some((w) => w.includes("trait-dirty.php")));
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});

test("V4: inlineWpdevClosure emits a dynamic closure-classmap.php and no static symbol maps", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "v4-inline-"));
  try {
    const providerDir = path.join(tmpDir, "fake-wpdev");
    await writeTree(path.join(providerDir, "src", "FrameworkClosure"), {});
    await writeTree(providerDir, {
      "modules/demo/src/class-thing.php":
        "<?php\nnamespace FW\\Demo;\nclass Thing { public function t() { return 'T'; } }\n",
      "modules/demo/src/traits/trait-helper.php":
        "<?php\nnamespace FW\\Demo;\ntrait Helper { public function h() { return 1; } }\n",
    });
    const pluginDir = path.join(tmpDir, "probe-plugin");
    await mkdir(pluginDir, { recursive: true });
    await writeFile(
      path.join(pluginDir, "probe-plugin.php"),
      `<?php\n/**\n * Plugin Name: Probe Plugin\n * Requires Plugins: wpdev\n */\n`,
      "utf8"
    );
    await writeFile(
      path.join(pluginDir, "composer.json"),
      JSON.stringify({ name: "test/probe-plugin", autoload: { "psr-4": { "ProbePlugin\\": "src/" } } }),
      "utf8"
    );

    const inlined = await inlineWpdevClosure({
      stagingPlugin: pluginDir,
      consumer: "probe-plugin",
      contentRoot: tmpDir,
      wpdevPluginDirOverride: providerDir,
    });
    assert.ok(inlined.inlinedFiles > 0, "Closure files must be inlined");

    const closureDir = path.join(pluginDir, "src", "FrameworkClosure");
    const classmapPath = path.join(closureDir, "closure-classmap.php");
    const { stdout: lint } = await execFileAsync("php", ["-l", classmapPath]);
    assert.match(lint, /No syntax errors detected/);
    const classmapSrc = await readFile(classmapPath, "utf8");
    assert.ok(classmapSrc.includes("FW\\\\Demo\\\\Thing"), "classmap must cover inlined declarations");

    const helperCode = await readFile(path.join(closureDir, "functions-closure.php"), "utf8");
    assert.ok(!helperCode.includes("$core_preload_map"), "static preload map must be gone");
    assert.ok(!helperCode.includes("$wpdev_closure_core_map"), "static core map must be gone");
    assert.ok(helperCode.includes("closure-classmap"), "autoloader must consult the dynamic classmap");
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});
