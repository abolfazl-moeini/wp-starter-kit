import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const script = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../protection-inventory.mjs",
);

test("records callable WPDev symbols without treating variables and strings as functions", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-protection-inventory-"));
  try {
    const plugin = path.join(root, "plugins", "tavangary-theme-panel");
    await mkdir(plugin, { recursive: true });
    await writeFile(
      path.join(plugin, "fixture.php"),
      `<?php
wpdev_real_call();
function_exists( 'wpdev_string_callable' );
$wpdev_local_state = 'wpdev_variable_value';
$message = 'wpdev_browser_callback';
// wpdev_comment_only
/** wpdev_documented_only() */
add_filter( 'wpdev_hook_name', '__return_true' );
`,
    );

    const output = path.join(root, "inventory.json");
    await execFileAsync(process.execPath, [script, root, output]);
    const inventory = JSON.parse(await readFile(output, "utf8"));
    const pluginInventory = inventory.plugins.find((item) => item.name === "tavangary-theme-panel");

    assert.deepEqual(
      pluginInventory.references.wpdevSymbols,
      ["wpdev_real_call", "wpdev_string_callable"],
    );
    assert.ok(
      pluginInventory.references.hooks.includes("add_filter( 'wpdev_hook_name'"),
      "Literal hooks remain a separate hook-contract input.",
    );
    assert.ok(
      !pluginInventory.references.wpdevSymbols.includes("wpdev_variable_value"),
      "A string value must not become a framework function dependency.",
    );
    assert.ok(
      !pluginInventory.references.wpdevSymbols.includes("wpdev_documented_only"),
      "A documented API name must not become a framework function dependency.",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects a source-tree symlink instead of silently omitting it from protection evidence", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-protection-inventory-symlink-"));
  try {
    const plugin = path.join(root, "plugins", "tavangary-theme-panel");
    const outside = path.join(root, "outside.php");
    await mkdir(plugin, { recursive: true });
    await writeFile(outside, "<?php wpdev_external();\n");
    await symlink(outside, path.join(plugin, "linked.php"));

    await assert.rejects(
      execFileAsync(process.execPath, [script, root, path.join(root, "inventory.json")]),
      (error) => {
        assert.match(error.stderr, /source-tree symlink is not allowed: linked\.php/);
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("ignores symlinks under explicitly excluded dependency directories", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-protection-inventory-excluded-symlink-"));
  try {
    const plugin = path.join(root, "plugins", "tavangary-theme-panel");
    const outside = path.join(root, "outside.php");
    await mkdir(path.join(plugin, "vendor"), { recursive: true });
    await writeFile(outside, "<?php wpdev_external();\n");
    await symlink(outside, path.join(plugin, "vendor", "linked.php"));

    await execFileAsync(process.execPath, [script, root, path.join(root, "inventory.json")]);
    const inventory = JSON.parse(await readFile(path.join(root, "inventory.json"), "utf8"));
    const panel = inventory.plugins.find((item) => item.name === "tavangary-theme-panel");
    assert.equal(panel.fileCount, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("does not truncate high-volume references", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-protection-inventory-volume-"));
  try {
    const plugin = path.join(root, "plugins", "tavangary-theme-panel");
    await mkdir(plugin, { recursive: true });
    const calls = Array.from({ length: 250 }, (_, index) => `wpdev_volume_${index}();`).join("\n");
    await writeFile(path.join(plugin, "fixture.php"), `<?php\n${calls}\n`);

    const output = path.join(root, "inventory.json");
    await execFileAsync(process.execPath, [script, root, output]);
    const inventory = JSON.parse(await readFile(output, "utf8"));
    const panel = inventory.plugins.find((item) => item.name === "tavangary-theme-panel");

    assert.equal(panel.references.wpdevSymbols.length, 250);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fails closed when a source file cannot be read", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-protection-inventory-unreadable-"));
  const unreadable = path.join(root, "plugins", "tavangary-theme-panel", "unreadable.php");
  try {
    await mkdir(path.dirname(unreadable), { recursive: true });
    await writeFile(unreadable, "<?php wpdev_hidden_dependency();\n");
    await chmod(unreadable, 0o000);

    await assert.rejects(
      execFileAsync(process.execPath, [script, root, path.join(root, "inventory.json")]),
      (error) => /cannot read source file|EACCES|permission denied/i.test(error.stderr),
    );
  } finally {
    await chmod(unreadable, 0o644).catch(() => {});
    await rm(root, { recursive: true, force: true });
  }
});
