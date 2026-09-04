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
  "../serialized-callback-inventory.mjs",
);

test("records first-party deserialization and magic callback surfaces while excluding dependencies", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-serialized-inventory-"));
  try {
    await mkdir(path.join(root, "plugins/wpdev/modules/core/src"), { recursive: true });
    await mkdir(path.join(root, "plugins/wpdev/vendor/package"), { recursive: true });
    await mkdir(path.join(root, "plugins/tavangary-theme-panel"), { recursive: true });
    await mkdir(path.join(root, "plugins/tavangary-core"), { recursive: true });
    await mkdir(path.join(root, "plugins/drm-connector"), { recursive: true });
    await mkdir(path.join(root, "themes/tavangary"), { recursive: true });
    await writeFile(
      path.join(root, "plugins/wpdev/modules/core/src/runtime.php"),
      "<?php\n$value = maybe_unserialize( $raw );\nclass Legacy { public function __wakeup() {} }\n",
    );
    await writeFile(
      path.join(root, "plugins/wpdev/vendor/package/ignored.php"),
      "<?php unserialize( $vendor_raw );\n",
    );

    const output = path.join(root, "serialized.json");
    await execFileAsync(process.execPath, [script, root, "tavangary-theme-panel", output]);
    const report = JSON.parse(await readFile(output, "utf8"));

    assert.equal(report.status, "review-required");
    assert.equal(report.buildInput, false);
    assert.deepEqual(report.findings, [
      {
        file: "plugins/wpdev/modules/core/src/runtime.php",
        kind: "deserialization",
        operation: "maybe_unserialize",
        line: 2,
      },
      {
        file: "plugins/wpdev/modules/core/src/runtime.php",
        kind: "magic-method",
        operation: "__wakeup",
        line: 3,
      },
    ]);
    assert.equal(
      report.blockers.persistedCallbackClosure,
      "Static source cannot prove serialized object/class-string/callback values or their external producers; review each finding with frozen data fixtures before prefixing or moving runtime classes.",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects a source-tree symlink instead of silently omitting it from serialized evidence", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-serialized-inventory-symlink-"));
  try {
    await mkdir(path.join(root, "plugins/wpdev/modules/core/src"), { recursive: true });
    await mkdir(path.join(root, "plugins/tavangary-theme-panel"), { recursive: true });
    await mkdir(path.join(root, "plugins/tavangary-core"), { recursive: true });
    await mkdir(path.join(root, "plugins/drm-connector"), { recursive: true });
    await mkdir(path.join(root, "themes/tavangary"), { recursive: true });
    await writeFile(path.join(root, "outside.php"), "<?php unserialize($raw);\n");
    await symlink(path.join(root, "outside.php"), path.join(root, "plugins/wpdev/modules/core/src/linked.php"));

    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "tavangary-theme-panel", path.join(root, "serialized.json")]),
      (error) => {
        assert.match(error.stderr, /source-tree symlink is not allowed: modules\/core\/src\/linked\.php/);
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fails closed when a scanned source root is missing", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-serialized-inventory-missing-root-"));
  try {
    await mkdir(path.join(root, "plugins/wpdev"), { recursive: true });
    await mkdir(path.join(root, "plugins/tavangary-theme-panel"), { recursive: true });
    await mkdir(path.join(root, "plugins/tavangary-core"), { recursive: true });
    await mkdir(path.join(root, "themes/tavangary"), { recursive: true });

    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "tavangary-theme-panel", path.join(root, "serialized.json")]),
      (error) => /cannot (?:read source directory|inspect source root)/.test(error.stderr),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects a symlinked scanned source root", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-serialized-inventory-root-symlink-"));
  try {
    await mkdir(path.join(root, "plugins"), { recursive: true });
    await mkdir(path.join(root, "outside-plugin"), { recursive: true });
    await symlink(path.join(root, "outside-plugin"), path.join(root, "plugins/wpdev"));
    for (const relative of ["tavangary-theme-panel", "tavangary-core", "drm-connector"]) {
      await mkdir(path.join(root, "plugins", relative), { recursive: true });
    }
    await mkdir(path.join(root, "themes/tavangary"), { recursive: true });

    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "tavangary-theme-panel", path.join(root, "serialized.json")]),
      (error) => /source-tree symlink is not allowed: plugins\/wpdev/.test(error.stderr),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
