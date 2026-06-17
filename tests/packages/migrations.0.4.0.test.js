/**
 * 0.4.0 migration — commitlint + hardened husky hooks.
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { existsSync } from "node:fs";

import { runMigrations } from "../../packages/create-wp-project/src/migrations/index.js";

describe("0.4.0 migration — commitlint + husky hooks", () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-mig-040-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function seedProject({ husky = "on", kitVersion = "0.3.0" } = {}) {
    const manifest = {
      schema: 1,
      kitVersion,
      distMode: "deps",
      generatedAt: "2026-01-01T00:00:00.000Z",
      features: { husky },
    };
    await fs.writeFile(
      path.join(tmpDir, "wpdev-kit.json"),
      JSON.stringify(manifest, null, 2) + "\n",
      "utf8",
    );
    await fs.mkdir(path.join(tmpDir, ".husky"), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, ".husky", "pre-commit"),
      '#!/usr/bin/env sh\n. "$(dirname -- "$0")/_/husky.sh"\n\nnpx lint-staged\n',
      { mode: 0o755 },
    );
    await fs.writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify(
        {
          name: "test-project",
          private: true,
          scripts: { prepare: "husky install" },
          devDependencies: { husky: "^9.0.0", "lint-staged": "^15.0.0" },
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
  }

  test("runMigrations 0.3.0 → 0.4.0 creates commitlint when husky is on", async () => {
    await seedProject({ husky: "on" });

    const res = await runMigrations(tmpDir, { from: "0.3.0", to: "0.4.0" });
    expect(res.ok).toBe(true);
    expect(res.ran).toEqual(["0.4.0"]);

    expect(existsSync(path.join(tmpDir, "commitlint.config.cjs"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".husky", "commit-msg"))).toBe(true);

    const preCommit = await fs.readFile(
      path.join(tmpDir, ".husky", "pre-commit"),
      "utf8",
    );
    expect(preCommit).toMatch(/passWithNoTests/);
    expect(preCommit).not.toMatch(/husky\.sh/);

    const commitMsg = await fs.readFile(
      path.join(tmpDir, ".husky", "commit-msg"),
      "utf8",
    );
    expect(commitMsg).toMatch(/commitlint/);

    const pkg = JSON.parse(
      await fs.readFile(path.join(tmpDir, "package.json"), "utf8"),
    );
    expect(pkg.devDependencies["@commitlint/cli"]).toBeDefined();
    expect(
      pkg.devDependencies["@commitlint/config-conventional"],
    ).toBeDefined();
    expect(pkg.scripts.prepare).toBe("husky");

    const after = JSON.parse(
      await fs.readFile(path.join(tmpDir, "wpdev-kit.json"), "utf8"),
    );
    expect(after.kitVersion).toBe("0.4.0");
  });

  test("runMigrations 0.3.0 → 0.4.0 skips commitlint when husky is off", async () => {
    await seedProject({ husky: "off" });

    const res = await runMigrations(tmpDir, { from: "0.3.0", to: "0.4.0" });
    expect(res.ok).toBe(true);
    expect(res.ran).toEqual(["0.4.0"]);

    expect(existsSync(path.join(tmpDir, "commitlint.config.cjs"))).toBe(false);
    expect(existsSync(path.join(tmpDir, ".husky", "commit-msg"))).toBe(false);
  });
});
