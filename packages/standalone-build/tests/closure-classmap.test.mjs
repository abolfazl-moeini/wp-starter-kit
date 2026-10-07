import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import {
  enrichClosureClassmapFile,
  generateClosureClassmap,
  inlineWpdevClosure,
  resolveMangledClassName,
} from "../inline-wpdev-closure.mjs";

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

test("V4: enrichClosureClassmapFile adds emitted-symbol entries for the runtime autoloader", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "v4-enrich-"));
  try {
    await writeTree(tmpDir, SYNTHETIC_TREE);
    const { map, traits } = await generateClosureClassmap(tmpDir);
    assert.ok(Object.keys(map).length > 0);
    const q = (v) => "'" + String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
    const mapLines = Object.entries(map).map(([k, v]) => `    ${q(k)} => ${q(v)},`);
    const traitLines = traits.map((v) => `    ${q(v)},`);
    await writeFile(
      path.join(tmpDir, "closure-classmap.php"),
      `<?php\nreturn array(\n  'map' => array(\n${mapLines.join("\n")}\n  ),\n  'traits' => array(\n${traitLines.join("\n")}\n  ),\n);\n`,
      "utf8",
    );
    const symbolClasses = {
      "FW\\Core\\Plugin": "_fc_1111",
      "\\FW\\Demo\\Thing": "\\_fc_2222",
      "fw\\demo\\second": "_fc_3333",
      "FW\\Demo\\Helper": "_fc_4444",
      "FW\\Demo\\Standalone": "_fc_4444",
      "FW\\Other\\Thing": "FW\\Other\\Thing",
    };
    const { enriched, warnings } = await enrichClosureClassmapFile(tmpDir, symbolClasses);
    assert.equal(enriched, 4);
    assert.ok(warnings.some((w) => w.includes("_fc_4444")), "shared destination must warn");
    assert.ok(warnings.some((w) => w.includes("FW\\Demo\\Dirty")), "unmapped original must warn");
    const { stdout: lint } = await execFileAsync("php", ["-l", path.join(tmpDir, "closure-classmap.php")]);
    assert.match(lint, /No syntax errors detected/);
    const classmapSrc = await readFile(path.join(tmpDir, "closure-classmap.php"), "utf8");
    assert.ok(classmapSrc.includes("'_fc_1111' => '/Core/Core/Plugin.php'"));
    assert.ok(classmapSrc.includes("'_fc_2222' => '/modules/demo/src/class-thing.php'"));
    assert.ok(classmapSrc.includes("'_fc_3333' => '/modules/demo/src/class-second.php'"));
    const mapSection = classmapSrc.slice(0, classmapSrc.indexOf("'traits'"));
    assert.equal(
      mapSection.split("'_fc_4444'").length - 1,
      1,
      "shared destination is emitted once (first wins), never duplicated in map",
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});

test("V4: enriched classmap resolves mangled names O(1) at runtime", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "v4-enrich-run-"));
  try {
    await writeTree(tmpDir, {
      "A/Thing.php": "<?php\nnamespace FW\\A;\nclass Thing { public static function t() { return 'T'; } }\n",
      "A/User.php": "<?php\nnamespace FW\\A;\nclass User extends \\FW\\A\\Thing {}\n",
    });
    const { map } = await generateClosureClassmap(tmpDir);
    const q = (v) => "'" + String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
    const mapLines = Object.entries(map).map(([k, v]) => `    ${q(k)} => ${q(v)},`);
    await writeFile(
      path.join(tmpDir, "closure-classmap.php"),
      `<?php\nreturn array(\n  'map' => array(\n${mapLines.join("\n")}\n  ),\n  'traits' => array(\n  ),\n);\n`,
      "utf8",
    );
    const symbolClasses = { "FW\\A\\Thing": "_fc_aaaa", "FW\\A\\User": "_fc_bbbb" };
    const { enriched } = await enrichClosureClassmapFile(tmpDir, symbolClasses);
    assert.equal(enriched, 2);
    const probe = `<?php
$maps = require '${path.join(tmpDir, "closure-classmap.php")}';
$hit = isset($maps['map']['_fc_bbbb']) ? $maps['map']['_fc_bbbb'] : null;
echo 'ENRICH-HIT:' . ($hit === $maps['map']['FW\\\\A\\\\User'] ? '1' : '0') . "\\n";
`;
    const probePath = path.join(tmpDir, "probe.php");
    await writeFile(probePath, probe, "utf8");
    const { stdout } = await execFileAsync("php", [probePath]);
    assert.ok(stdout.includes("ENRICH-HIT:1"), `mangled key must hit the same path, got: ${stdout}`);
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
