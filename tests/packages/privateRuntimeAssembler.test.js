import { describe, expect, test } from "@jest/globals";
import path from "node:path";
import os from "node:os";
import { promises as fs } from "node:fs";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { createCanonicalZip } from "../../packages/create-wp-project/src/release/canonical-zip.js";

import {
  assemblePrivateRuntime,
  buildRuntimePrefix,
  buildPrivateStateKey,
  validateArtifactRegistry,
} from "../fixtures/private-runtime-fixture/assembler.js";

describe("private runtime fixture contract", () => {
  test("validates the fixture registry and derives a stable prefix", () => {
    const registry = {
      version: 1,
      artifacts: [
        {
          artifactId: "fixture-admin-001",
          slug: "private-runtime-fixture",
          runtimePrefix: "FixtureAdmin001PrivateRuntimeFixtureRt",
          vendorPrefix: "FixtureAdmin001PrivateRuntimeFixtureVendor",
          sourceDigest:
            "329e3485ab18b3df166e295525277fba55dc4619cef131852ca6cdee6fe5db54",
          toolDigest:
            "bf7aa9ba869a7ae30be01d045f8d2d52a93b955941def3058e409b256ac47923",
        },
      ],
    };

    expect(validateArtifactRegistry(registry)).toEqual({ valid: true });
    expect(
      buildRuntimePrefix("fixture-admin-001", "private-runtime-fixture"),
    ).toBe("FixtureAdmin001PrivateRuntimeFixtureRt");
    expect(
      validateArtifactRegistry({
        version: 1,
        artifacts: [
          {
            ...registry.artifacts[0],
            runtimePrefix: "FixtureAdmin001PrivateRuntimeFixtureRt",
          },
          {
            ...registry.artifacts[0],
            artifactId: "fixture-admin-002",
            runtimePrefix: "FixtureAdmin001PrivateRuntimeFixtureRt",
          },
        ],
      }),
    ).toEqual({ valid: false, error: "duplicate runtimePrefix" });
  });

  test("assembles the exact fixture closure and rewrites PHP call sites", async () => {
    const output = path.join(
      os.tmpdir(),
      `private-runtime-fixture-${Date.now()}`,
    );
    const result = await assemblePrivateRuntime({
      root: path.join(process.cwd(), "tests/fixtures/private-runtime-fixture"),
      output,
      registry: {
        version: 1,
        artifacts: [
          {
            artifactId: "fixture-admin-001",
            slug: "private-runtime-fixture",
            runtimePrefix: "FixtureAdmin001PrivateRuntimeFixtureRt",
            vendorPrefix: "FixtureAdmin001PrivateRuntimeFixtureVendor",
            sourceDigest:
              "329e3485ab18b3df166e295525277fba55dc4619cef131852ca6cdee6fe5db54",
            toolDigest:
              "bf7aa9ba869a7ae30be01d045f8d2d52a93b955941def3058e409b256ac47923",
          },
        ],
      },
    });

    expect(result.files).toEqual(
      expect.arrayContaining([
        "private-runtime/RuntimeKernel.php",
        "private-runtime/TableBuilder.php",
        "src/Module.php",
        "src/Installer.php",
        "src/Bootstrap.php",
        "assets/admin.css",
      ]),
    );
    expect(result.files).not.toEqual(
      expect.arrayContaining([
        "src/unused.php",
        "private-runtime/ActionScheduler.php",
      ]),
    );
    expect(result.php["src/Module.php"]).toContain(
      "FixtureAdmin001PrivateRuntimeFixtureRt_register_table",
    );
    expect(result.php["src/Module.php"]).not.toContain("wpdev_register_table");
    expect(result.php["src/Module.php"]).toContain("static function");
    expect(result.php["src/Module.php"]).toContain("add_menu_page");
    expect(result.php["src/Module.php"]).toContain(
      "wp_ajax_private_runtime_fixture_save",
    );
    expect(result.php["src/Module.php"]).toContain("register_rest_route");
    expect(result.php["src/Module.php"]).toContain(
      "private_runtime_fixture_cron_callback",
    );
    expect(result.php["src/Installer.php"]).toContain("dbDelta");
    expect(result.php["src/Installer.php"]).toContain(
      "manage_private_runtime_fixture",
    );
    expect(result.php["src/Bootstrap.php"]).toContain("WP_SANDBOX_SCRAPING");
    expect(result.php["src/Bootstrap.php"]).toMatch(
      /WP_SANDBOX_SCRAPING[\s\S]*return[\s\S]*private_runtime_fixture_install/,
    );
    for (const file of [
      "private-runtime/RuntimeKernel.php",
      "private-runtime/TableBuilder.php",
      "src/Module.php",
    ]) {
      const lint = spawnSync("php", ["-l", path.join(output, file)], {
        encoding: "utf8",
      });
      expect(lint.status).toBe(0);
    }
  });

  test("fails closed on unresolved dynamic framework calls", async () => {
    await expect(
      assemblePrivateRuntime({
        root: path.join(
          process.cwd(),
          "tests/fixtures/private-runtime-fixture-dynamic",
        ),
        output: path.join(
          os.tmpdir(),
          `private-runtime-fixture-dynamic-${Date.now()}`,
        ),
        registry: {
          version: 1,
          artifacts: [
            {
              artifactId: "fixture-admin-001",
              slug: "private-runtime-fixture",
              runtimePrefix: "FixtureAdmin001PrivateRuntimeFixtureRt",
              vendorPrefix: "FixtureAdmin001PrivateRuntimeFixtureVendor",
              sourceDigest:
                "329e3485ab18b3df166e295525277fba55dc4619cef131852ca6cdee6fe5db54",
              toolDigest:
                "bf7aa9ba869a7ae30be01d045f8d2d52a93b955941def3058e409b256ac47923",
            },
          ],
        },
      }),
    ).rejects.toThrow(/unresolved dynamic/i);
  });

  test("rejects an output nested in the immutable source tree", async () => {
    await expect(
      assemblePrivateRuntime({
        root: path.join(
          process.cwd(),
          "tests/fixtures/private-runtime-fixture",
        ),
        output: path.join(
          process.cwd(),
          "tests/fixtures/private-runtime-fixture",
          "dist",
        ),
        registry: JSON.parse(
          await fs.readFile(
            path.join(
              process.cwd(),
              "config/protection-artifact-registry.json",
            ),
            "utf8",
          ),
        ),
      }),
    ).rejects.toThrow(/outside the immutable source tree/i);
  });

  test("rejects a non-empty output so stale files cannot leak into an artifact", async () => {
    const root = path.join(
      process.cwd(),
      "tests/fixtures/private-runtime-fixture",
    );
    const output = await fs.mkdtemp(
      path.join(os.tmpdir(), "private-runtime-stale-output-"),
    );
    await fs.writeFile(path.join(output, "stale.php"), "<?php");
    await expect(
      assemblePrivateRuntime({
        root,
        output,
        registry: JSON.parse(
          await fs.readFile(
            path.join(
              process.cwd(),
              "config/protection-artifact-registry.json",
            ),
            "utf8",
          ),
        ),
      }),
    ).rejects.toThrow(/output directory must be empty/i);
    await fs.rm(output, { recursive: true, force: true });
  });

  test("rejects closure files reached through a symlinked parent directory", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "private-runtime-symlink-parent-"),
    );
    const outside = await fs.mkdtemp(
      path.join(os.tmpdir(), "private-runtime-symlink-target-"),
    );
    await fs.writeFile(path.join(outside, "file.txt"), "outside\n");
    await fs.symlink(outside, path.join(root, "linked"), "dir");
    await fs.writeFile(
      path.join(root, "protection-policy.json"),
      JSON.stringify({
        artifactId: "fixture-admin-001",
        slug: "private-runtime-fixture",
        runtimePrefix: "FixtureAdmin001PrivateRuntimeFixtureRt",
        vendorPrefix: "FixtureAdmin001PrivateRuntimeFixtureVendor",
        closure: ["linked/file.txt"],
        fileRoles: { "linked/file.txt": "static-public" },
      }),
    );

    await expect(
      assemblePrivateRuntime({
        root,
        output: path.join(
          os.tmpdir(),
          `private-runtime-symlink-out-${Date.now()}`,
        ),
        registry: {
          version: 1,
          artifacts: [
            {
              artifactId: "fixture-admin-001",
              slug: "private-runtime-fixture",
              runtimePrefix: "FixtureAdmin001PrivateRuntimeFixtureRt",
              vendorPrefix: "FixtureAdmin001PrivateRuntimeFixtureVendor",
              sourceDigest:
                "329e3485ab18b3df166e295525277fba55dc4619cef131852ca6cdee6fe5db54",
              toolDigest:
                "bf7aa9ba869a7ae30be01d045f8d2d52a93b955941def3058e409b256ac47923",
            },
          ],
        },
      }),
    ).rejects.toThrow(/symlink/i);

    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(outside, { recursive: true, force: true });
  });

  test("uses the checked-in registry and preserves CSS relative asset topology", async () => {
    const registry = JSON.parse(
      await fs.readFile(
        path.join(process.cwd(), "config/protection-artifact-registry.json"),
        "utf8",
      ),
    );
    expect(validateArtifactRegistry(registry)).toEqual({ valid: true });
    const output = path.join(
      os.tmpdir(),
      `private-runtime-fixture-assets-${Date.now()}`,
    );
    const result = await assemblePrivateRuntime({
      root: path.join(process.cwd(), "tests/fixtures/private-runtime-fixture"),
      output,
      registry,
    });
    const css = await fs.readFile(
      path.join(output, "assets/admin.css"),
      "utf8",
    );
    expect(css).toContain('url("img/icon.svg")');
    expect(css).toContain('url("fonts/test.woff2")');
    await expect(
      fs.stat(path.join(output, "assets/img/icon.svg")),
    ).resolves.toBeTruthy();
    await expect(
      fs.stat(path.join(output, "assets/fonts/test.woff2")),
    ).resolves.toBeTruthy();
    expect(result.files).not.toContain("src/autoload-trap.php");
  });

  test("records public ownership and explicitly excludes eager-load/build-only files", async () => {
    const root = path.join(
      process.cwd(),
      "tests/fixtures/private-runtime-fixture",
    );
    const policy = JSON.parse(
      await fs.readFile(path.join(root, "protection-policy.json"), "utf8"),
    );
    expect(policy.settingsOwnership).toEqual({
      fixture_setting: "fixture-admin-001",
    });
    expect(policy.capabilityOwnership).toContain(
      "manage_private_runtime_fixture",
    );
    expect(policy.schemaOwnership).toContain("wp_private_runtime_fixture");
    expect(policy.publicContracts.rest).toContain(
      "private-runtime-fixture/v1/items",
    );
    expect(policy.restMap["private-runtime-fixture/v1/items"].methods).toEqual([
      "GET",
    ]);
    expect(policy.hookMap.private_runtime_fixture_saved.owner).toBe(
      "fixture-admin-001",
    );
    expect(policy.assetMap["private-runtime-fixture-admin"]).toEqual(
      expect.arrayContaining(["assets/admin.css", "assets/img/icon.svg"]),
    );
    expect(policy.fileRoles["src/autoload-trap.php"]).toBe("exclude");
    expect(policy.fileRoles["composer.json"]).toBe("exclude");
    expect(policy.fileRoles["private-runtime/ActionScheduler.php"]).toBe(
      "exclude",
    );
  });

  test("is idempotent and never mutates the fixture source tree", async () => {
    const root = path.join(
      process.cwd(),
      "tests/fixtures/private-runtime-fixture",
    );
    const source = await fs.readFile(path.join(root, "src/Module.php"));
    const before = crypto.createHash("sha256").update(source).digest("hex");
    const registry = JSON.parse(
      await fs.readFile(
        path.join(process.cwd(), "config/protection-artifact-registry.json"),
        "utf8",
      ),
    );
    const first = await assemblePrivateRuntime({
      root,
      output: path.join(
        os.tmpdir(),
        `private-runtime-fixture-one-${Date.now()}`,
      ),
      registry,
    });
    const second = await assemblePrivateRuntime({
      root,
      output: path.join(
        os.tmpdir(),
        `private-runtime-fixture-two-${Date.now()}`,
      ),
      registry,
    });
    expect(first.files).toEqual(second.files);
    expect(first.php).toEqual(second.php);
    expect(
      crypto
        .createHash("sha256")
        .update(await fs.readFile(path.join(root, "src/Module.php")))
        .digest("hex"),
    ).toBe(before);
  });

  test("shortens private transient keys symmetrically within WordPress limits", () => {
    const logical = "x".repeat(260);
    const ordinary = buildPrivateStateKey(
      "private_runtime_fixture_rt_",
      logical,
      "transient",
    );
    const site = buildPrivateStateKey(
      "private_runtime_fixture_rt_",
      logical,
      "site-transient",
    );
    expect(ordinary.length).toBeLessThanOrEqual(172);
    expect(site.length).toBeLessThanOrEqual(167);
    expect(ordinary).toContain("_h");
    expect(ordinary).toBe(
      buildPrivateStateKey("private_runtime_fixture_rt_", logical, "transient"),
    );
    expect(ordinary).not.toBe(site);
  });

  test("builds Profile A fixture ZIP, re-extracts it, and preserves its hash", async () => {
    const root = path.join(
      process.cwd(),
      "tests/fixtures/private-runtime-fixture",
    );
    const registry = JSON.parse(
      await fs.readFile(
        path.join(process.cwd(), "config/protection-artifact-registry.json"),
        "utf8",
      ),
    );
    const work = await fs.mkdtemp(
      path.join(os.tmpdir(), "private-runtime-profile-a-"),
    );
    const assembled = path.join(work, "private-runtime-fixture");
    await assemblePrivateRuntime({ root, output: assembled, registry });
    const zip = path.join(work, "private-runtime-fixture.zip");
    await createCanonicalZip({
      sourceRoot: assembled,
      outputZip: zip,
      rootName: "private-runtime-fixture",
    });
    const firstHash = crypto
      .createHash("sha256")
      .update(await fs.readFile(zip))
      .digest("hex");
    const extract = path.join(work, "extract");
    const unzip = spawnSync("unzip", ["-q", zip, "-d", extract], {
      encoding: "utf8",
    });
    expect(unzip.status).toBe(0);
    const extractedModule = await fs.readFile(
      path.join(extract, "private-runtime-fixture/src/Module.php"),
      "utf8",
    );
    expect(extractedModule).toContain(
      "FixtureAdmin001PrivateRuntimeFixtureRt_register_table",
    );
    const secondZip = path.join(work, "private-runtime-fixture-2.zip");
    await createCanonicalZip({
      sourceRoot: assembled,
      outputZip: secondZip,
      rootName: "private-runtime-fixture",
    });
    expect(
      crypto
        .createHash("sha256")
        .update(await fs.readFile(secondZip))
        .digest("hex"),
    ).toBe(firstHash);
    await fs.rm(work, { recursive: true, force: true });
  });
});
