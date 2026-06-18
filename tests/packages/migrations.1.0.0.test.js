/**
 * 1.0.0 migration test.
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { existsSync } from "node:fs";

import { runMigrations } from "../../packages/create-wp-project/src/migrations/index.js";

describe("1.0.0 migration — WPDev companion updates", () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-mig-100-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function seedProject({
    phpFramework = "wpdev",
    kitVersion = "0.4.0",
  } = {}) {
    const manifest = {
      schema: 1,
      kitVersion,
      distMode: "deps",
      generatedAt: "2026-01-01T00:00:00.000Z",
      features: { phpFramework },
    };
    await fs.writeFile(
      path.join(tmpDir, "wpdev-kit.json"),
      JSON.stringify(manifest, null, 2) + "\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(tmpDir, "project.config.json"),
      JSON.stringify(
        { slug: "test-plugin", globalName: "TestPlugin" },
        null,
        2,
      ) + "\n",
      "utf8",
    );
  }

  test("runMigrations 0.4.0 → 1.0.0 updates framework when phpFramework is wpdev", async () => {
    await seedProject({ phpFramework: "wpdev" });

    const res = await runMigrations(tmpDir, { from: "0.4.0", to: "1.0.0" });
    expect(res.ok).toBe(true);
    expect(res.ran).toEqual(["1.0.0"]);

    expect(
      existsSync(path.join(tmpDir, "companion-plugins", "wpdev", "wpdev.php")),
    ).toBe(true);
    expect(
      existsSync(path.join(tmpDir, "src", "Support", "FrameworkBridge.php")),
    ).toBe(true);
    expect(
      existsSync(path.join(tmpDir, "src", "wpdev-demo-register.php")),
    ).toBe(true);
    expect(existsSync(path.join(tmpDir, "MIGRATION-NOTES-1.0.0.md"))).toBe(
      true,
    );

    const bridge = await fs.readFile(
      path.join(tmpDir, "src", "Support", "FrameworkBridge.php"),
      "utf8",
    );
    expect(bridge).toContain("FrameworkBridge");
    expect(bridge).toContain("TestPlugin");

    const after = JSON.parse(
      await fs.readFile(path.join(tmpDir, "wpdev-kit.json"), "utf8"),
    );
    expect(after.kitVersion).toBe("1.0.0");
  });

  test("runMigrations 0.4.0 → 1.0.0 skips framework when phpFramework is none", async () => {
    await seedProject({ phpFramework: "none" });

    const res = await runMigrations(tmpDir, { from: "0.4.0", to: "1.0.0" });
    expect(res.ok).toBe(true);
    expect(res.ran).toEqual(["1.0.0"]);

    expect(
      existsSync(path.join(tmpDir, "companion-plugins", "wpdev", "wpdev.php")),
    ).toBe(false);
    expect(
      existsSync(path.join(tmpDir, "src", "Support", "FrameworkBridge.php")),
    ).toBe(false);
  });
});
