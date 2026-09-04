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
  "../settings-field-inventory.mjs",
);

test("records settings fields from sibling files after scanning subdirectories", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-settings-inventory-siblings-"));
  try {
    const plugin = path.join(root, "plugins", "tavangary-theme-panel");
    await mkdir(path.join(plugin, "includes"), { recursive: true });
    await writeFile(path.join(plugin, "includes", "nested.php"), "<?php\n");
    await writeFile(
      path.join(plugin, "register.php"),
      "<?php wpdev_register_settings_field('section', 'owned_field');\n",
    );
    const output = path.join(root, "settings.json");
    await execFileAsync(process.execPath, [script, root, output]);
    const report = JSON.parse(await readFile(output, "utf8"));
    assert.deepEqual(
      report.plugins["tavangary-theme-panel"].fields.owned_field,
      ["register.php"],
      "A subdirectory must not stop the walker from reading sibling PHP files.",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects a source-tree symlink instead of silently omitting it from settings evidence", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-settings-inventory-symlink-"));
  try {
    const plugin = path.join(root, "plugins", "tavangary-theme-panel");
    await mkdir(plugin, { recursive: true });
    await writeFile(path.join(root, "outside.php"), "<?php wpdev_register_settings_field('section', 'secret_field');\n");
    await symlink(path.join(root, "outside.php"), path.join(plugin, "linked.php"));

    await assert.rejects(
      execFileAsync(process.execPath, [script, root, path.join(root, "settings.json")]),
      (error) => {
        assert.match(error.stderr, /source-tree symlink is not allowed: linked\.php/);
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects a symlinked consumer root instead of scanning outside the content tree", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-settings-inventory-root-symlink-"));
  try {
    await mkdir(path.join(root, "plugins"), { recursive: true });
    await mkdir(path.join(root, "outside-plugin"), { recursive: true });
    await symlink(path.join(root, "outside-plugin"), path.join(root, "plugins/tavangary-theme-panel"));

    await assert.rejects(
      execFileAsync(process.execPath, [script, root, path.join(root, "settings.json")]),
      (error) => /source-tree symlink is not allowed: plugins\/tavangary-theme-panel/.test(error.stderr),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
