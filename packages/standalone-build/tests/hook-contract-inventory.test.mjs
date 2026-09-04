import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const script = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../hook-contract-inventory.mjs",
);

test("rejects a source-tree symlink instead of silently omitting it from hook evidence", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-hook-inventory-symlink-"));
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
            references: { hooks: ["add_filter( 'wpdev_public'"] },
          },
        ],
      }),
    );
    await writeFile(path.join(root, "plugins/wpdev/modules/runtime.php"), "<?php do_action('wpdev_public');\n");
    await writeFile(path.join(root, "outside.php"), "<?php add_filter('wpdev_public', 'listener');\n");
    await symlink(path.join(root, "outside.php"), path.join(root, "plugins/pilot/linked.php"));

    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot", path.join(root, "hooks.json")]),
      (error) => {
        assert.match(error.stderr, /source-tree symlink is not allowed: linked\.php/);
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
