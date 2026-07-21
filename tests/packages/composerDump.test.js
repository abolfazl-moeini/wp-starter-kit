/**
 * composer dump-autoload helper + doctor stale-map detection.
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs, existsSync } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { dumpComposerAutoload } from "../../packages/create-wp-project/src/composer-dump.js";
import {
  checkComposerAutoloadFiles,
  checkStaleVendorAutoloadFiles,
} from "../../packages/create-wp-project/src/doctor.js";

describe("dumpComposerAutoload", () => {
  let tmp;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-dump-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("skips when composer.json is missing", () => {
    const r = dumpComposerAutoload(tmp);
    expect(r.ok).toBe(true);
    expect(r.skipped).toBe(true);
  });

  test("skips when vendor/ is missing", async () => {
    await fs.writeFile(
      path.join(tmp, "composer.json"),
      JSON.stringify({ name: "x/y", require: {} }),
      "utf8",
    );
    const r = dumpComposerAutoload(tmp);
    expect(r.ok).toBe(true);
    expect(r.skipped).toBe(true);
    expect(r.reason).toMatch(/vendor/);
  });
});

describe("doctor composer autoload checks", () => {
  let tmp;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-doctor-autoload-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("checkComposerAutoloadFiles errors when listed file is missing", async () => {
    await fs.writeFile(
      path.join(tmp, "composer.json"),
      JSON.stringify({
        autoload: { files: ["src/blocks-register.php", "src/ok.php"] },
      }),
      "utf8",
    );
    await fs.mkdir(path.join(tmp, "src"), { recursive: true });
    await fs.writeFile(path.join(tmp, "src/ok.php"), "<?php\n", "utf8");

    const errors = checkComposerAutoloadFiles(tmp);
    expect(errors.some((e) => e.includes("blocks-register.php"))).toBe(true);
    expect(errors.some((e) => e.includes("ok.php"))).toBe(false);
  });

  test("checkStaleVendorAutoloadFiles warns when vendor map references removed files", async () => {
    await fs.writeFile(
      path.join(tmp, "composer.json"),
      JSON.stringify({
        autoload: { files: ["src/demo-samples-register.php"] },
      }),
      "utf8",
    );
    await fs.mkdir(path.join(tmp, "vendor/composer"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "vendor/composer/autoload_files.php"),
      `<?php
return array(
    'aaa' => $baseDir . '/src/blocks-register.php',
    'bbb' => $baseDir . '/src/demo-samples-register.php',
    'ccc' => $vendorDir . '/blockstudio/blockstudio/bootstrap.php',
);
`,
      "utf8",
    );

    const warnings = checkStaleVendorAutoloadFiles(tmp);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toMatch(/blocks-register\.php/);
    expect(warnings[0]).toMatch(/composer dump-autoload/);
  });
});
