import { expect, test } from "@jest/globals";
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

test("shared settings write rereads and preserves sibling fields", async () => {
  const root = path.join(process.cwd(), "packages/wpdev-framework");
  const script = path.join(
    await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-settings-")),
    "settings.php",
  );
  const source = `<?php
define('ABSPATH', __DIR__);
$GLOBALS['option'] = array();
function wpdev_get_option($key) { return $GLOBALS['option'][$key] ?? array(); }
function wpdev_save_option($key, $value) { $GLOBALS['option'][$key] = $value; return true; }
require ${JSON.stringify(path.join(root, "modules/settings-panel-builder/src/class-settings-save.php"))};
require ${JSON.stringify(path.join(root, "modules/settings-panel-builder/src/class-settings-storage.php"))};
$storage = new \\WPDevFramework\\Modules\\SettingsPanelBuilder\\Settings_Storage();
$storage->prime(array('theme' => 'stale', 'crm' => 'stale'));
$GLOBALS['option']['v2_settings'] = array('theme' => 'old', 'crm' => 'latest', 'tickets' => 'latest');
echo json_encode($storage->replace_registered(array('theme' => 'new')));
`;
  await fs.writeFile(script, source, "utf8");
  const result = spawnSync("php", [script], { encoding: "utf8" });
  await fs.rm(path.dirname(script), { recursive: true, force: true });

  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual({
    theme: "new",
    crm: "latest",
    tickets: "latest",
  });
});
