/**
 * Doctor checks for Docker-safe php-fault-tolerance installs.
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { checkFaultToleranceInstall } from "../../packages/create-wp-project/src/doctor.js";

describe("checkFaultToleranceInstall", () => {
  let tmp;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-doctor-ft-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("errors when faultTolerance:on but packages copy missing", () => {
    const errors = checkFaultToleranceInstall(tmp, { faultTolerance: "on" });
    expect(errors.some((e) => /packages\/php-fault-tolerance/.test(e))).toBe(
      true,
    );
  });

  test("errors when vendor is a host-absolute symlink", async () => {
    await fs.mkdir(path.join(tmp, "packages/php-fault-tolerance/src"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(tmp, "packages/php-fault-tolerance/src/bootstrap.php"),
      "<?php\n",
      "utf8",
    );
    await fs.mkdir(path.join(tmp, "vendor/wpdev"), { recursive: true });
    await fs.symlink(
      "/tmp/fake-kit/packages/php-fault-tolerance",
      path.join(tmp, "vendor/wpdev/php-fault-tolerance"),
    );
    const errors = checkFaultToleranceInstall(tmp, { faultTolerance: "on" });
    expect(errors.some((e) => /host-absolute symlink/i.test(e))).toBe(true);
  });

  test("ok when packages present and vendor is a real directory", async () => {
    await fs.mkdir(path.join(tmp, "packages/php-fault-tolerance/src"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(tmp, "packages/php-fault-tolerance/src/bootstrap.php"),
      "<?php\n",
      "utf8",
    );
    await fs.mkdir(path.join(tmp, "vendor/wpdev/php-fault-tolerance/src"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(tmp, "vendor/wpdev/php-fault-tolerance/src/bootstrap.php"),
      "<?php\n",
      "utf8",
    );
    expect(checkFaultToleranceInstall(tmp, { faultTolerance: "on" })).toEqual(
      [],
    );
  });
});
