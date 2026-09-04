import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const script = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../framework-closure-inventory.mjs",
);

test("rejects a source-tree symlink instead of silently omitting it from closure evidence", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-closure-inventory-symlink-"));
  try {
    await mkdir(path.join(root, "plugins/wpdev/modules"), { recursive: true });
    await mkdir(path.join(root, "plugins/pilot"), { recursive: true });
    await writeFile(
      path.join(root, "protection-inventory.json"),
      JSON.stringify({
        plugins: [
          {
            name: "pilot",
            root: "plugins/pilot",
            references: { wpdevSymbols: [], frameworkNamespaces: [], hooks: [], dynamicEdges: [] },
          },
        ],
      }),
    );
    await writeFile(path.join(root, "outside.php"), "<?php function wpdev_external() {}\n");
    await writeFile(path.join(root, "plugins/pilot/consumer.php"), "<?php\n");
    await symlink(path.join(root, "outside.php"), path.join(root, "plugins/wpdev/modules/linked.php"));

    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot", path.join(root, "closure.json")]),
      (error) => {
        assert.match(error.stderr, /source-tree symlink is not allowed: modules\/linked\.php/);
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fails closed when a literal include escapes the framework root", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-closure-traversal-"));
  try {
    await mkdir(path.join(root, "plugins/wpdev/modules"), { recursive: true });
    await mkdir(path.join(root, "plugins/pilot"), { recursive: true });
    await writeFile(
      path.join(root, "protection-inventory.json"),
      JSON.stringify({
        plugins: [
          {
            name: "pilot",
            root: "plugins/pilot",
            references: {
              wpdevSymbols: ["wpdev_test"],
              frameworkNamespaces: [],
              hooks: [],
              dynamicEdges: [],
            },
          },
        ],
      }),
    );
    await writeFile(path.join(root, "plugins/pilot/consumer.php"), "<?php wpdev_test();\n");
    await writeFile(
      path.join(root, "plugins/wpdev/modules/sample.php"),
      "<?php\nfunction wpdev_test() {}\nrequire_once dirname(__DIR__, 3) . '/outside.php';\n",
    );
    await writeFile(path.join(root, "plugins/outside.php"), "<?php // outside framework root\n");

    const output = path.join(root, "closure.json");
    await execFileAsync(process.execPath, [script, root, "pilot", output]);
    const inventory = JSON.parse(await readFile(output, "utf8"));

    assert.equal(
      inventory.literalIncludeClosure.files.some((file) => file.startsWith("../")),
      false,
      "Closure inventory must never follow a file outside plugins/wpdev.",
    );
    assert.ok(
      inventory.literalIncludeClosure.unresolved.some(
        (item) => item.expression === "unsafe include outside framework root: ../../outside.php",
      ),
      "Escaping include must remain an explicit promotion blocker.",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("classifies a reviewed dynamic hook producer without treating it as unresolved", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-closure-dynamic-hook-"));
  try {
    await mkdir(path.join(root, "plugins/wpdev/modules"), { recursive: true });
    await mkdir(path.join(root, "plugins/pilot"), { recursive: true });
    await writeFile(
      path.join(root, "protection-inventory.json"),
      JSON.stringify({
        plugins: [
          {
            name: "pilot",
            root: "plugins/pilot",
            references: {
              wpdevSymbols: [],
              frameworkNamespaces: [],
              hooks: ["add_filter( 'wpdev_dynamic_hook'"],
              dynamicEdges: [],
            },
          },
        ],
      }),
    );
    await writeFile(
      path.join(root, "hook-contract-inventory.json"),
      JSON.stringify({
        contracts: {
          wpdev_dynamic_hook: {
            matchingFrameworkDynamicProducers: [
              { path: "modules/dynamic.php" },
            ],
          },
        },
      }),
    );
    await writeFile(path.join(root, "plugins/pilot/consumer.php"), "<?php\n");
    await writeFile(
      path.join(root, "plugins/wpdev/modules/dynamic.php"),
      "<?php do_action( 'wpdev_' . $field );\n",
    );

    const output = path.join(root, "closure.json");
    await execFileAsync(process.execPath, [script, root, "pilot", output]);
    const inventory = JSON.parse(await readFile(output, "utf8"));

    assert.deepEqual(inventory.unresolved.hooks, []);
    assert.deepEqual(
      inventory.mappings.dynamicHookProducers.wpdev_dynamic_hook,
      ["modules/dynamic.php"],
    );
    assert.ok(
      inventory.literalIncludeClosure.files.includes("modules/dynamic.php"),
      "The reviewed dynamic producer remains part of the evidence closure.",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
