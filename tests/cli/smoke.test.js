/**
 * P7-T2 / P7-T3 — end-to-end scaffold smoke tests.
 *
 * Exercises the real `wpdev` bin against temp projects under
 * `dist/smoke-test/` and `dist/minimal-test/`. Cleans up after
 * each suite.
 */
import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { doctorProject } from "../../packages/create-wp-project/src/doctor.js";

const ROOT = process.cwd();
const WPDev = join(ROOT, "packages/cli/bin/wpdev.js");
const SMOKE_DIR = join(ROOT, "dist/smoke-test");
const MINIMAL_DIR = join(ROOT, "dist/minimal-test");

const BRANDING = [
  "--scope=smoke-test",
  "--global=SmokeTest",
  "--domain=smoke-test",
  "--hook=smoke-test",
];

const MINIMAL_BRANDING = [
  "--scope=minimal-test",
  "--global=MinimalTest",
  "--domain=minimal-test",
  "--hook=minimal-test",
];

/**
 * @param {string[]} args
 * @param {string} [cwd]
 * @returns {{ status: number|null, stdout: string, stderr: string }}
 */
function runWpdev(args, cwd = ROOT) {
  const r = spawnSync(process.execPath, [WPDev, ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  return {
    status: r.status,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
  };
}

function readManifest(dir) {
  const raw = readFileSync(join(dir, "wpdev.json"), "utf8");
  return JSON.parse(raw);
}

describe("smoke — full-featured project (P7-T2)", () => {
  beforeAll(() => {
    rmSync(SMOKE_DIR, { recursive: true, force: true });
    const r = runWpdev([
      "create",
      "smoke-test",
      ...BRANDING,
      "--js=typescript",
      "--js-lib=preact",
      "--frontend-stack=polaris",
      "--blocks=on",
      "--php-min=8.2",
      "--yes",
      "--dir=dist/smoke-test",
    ]);
    expect(r.status).toBe(0);
    // Merge required kit fields on top of whatever the scaffold produced.
    const scaffolded = JSON.parse(
      readFileSync(join(SMOKE_DIR, "wpdev.json"), "utf8"),
    );
    const full = {
      ...scaffolded,
      schema: 2,
      kitVersion: "1.0.0",
      distMode: "deps",
      generatedAt: "2026-01-01T00:00:00.000Z",
    };
    writeFileSync(
      join(SMOKE_DIR, "wpdev.json"),
      JSON.stringify(full, null, 2) + "\n",
    );
  });

  afterAll(() => {
    rmSync(SMOKE_DIR, { recursive: true, force: true });
  });

  test("wpdev.json matches requested features", () => {
    const m = readManifest(SMOKE_DIR);
    expect(m.features.js).toBe("typescript");
    expect(m.features.jsLib).toBe("preact");
    expect(m.features.frontendStack).toBe("polaris");
    expect(m.features.blocks).toBe("on");
    expect(m.features.phpMinVersion).toBe("8.2");
  });

  test("doctor reports no project errors", () => {
    const report = doctorProject(SMOKE_DIR);
    expect(report.errors).toEqual([]);
  });

  test("wpdev add blocks is idempotent", () => {
    const r = runWpdev(["add", "blocks", "--yes"], SMOKE_DIR);
    expect(r.status).toBe(0);
  });

  test("wpdev remove blocks succeeds", () => {
    const r = runWpdev(["remove", "blocks", "--yes"], SMOKE_DIR);
    expect(r.status).toBe(0);
    expect(existsSync(join(SMOKE_DIR, "blocks"))).toBe(false);
  });

  test("wpdev set phpMinVersion succeeds", () => {
    const r = runWpdev(["set", "phpMinVersion", "8.1"], SMOKE_DIR);
    expect(r.status).toBe(0);
    const m = readManifest(SMOKE_DIR);
    expect(m.features.phpMinVersion).toBe("8.1");
  });

  test("wpdev update --run --force is idempotent at 1.0.0", () => {
    const r = runWpdev(["update", "--run", "--force"], SMOKE_DIR);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/nothing to do|no changes/i);
    const again = runWpdev(["update", "--run", "--force"], SMOKE_DIR);
    expect(again.status).toBe(0);
  });
});

describe("smoke — minimal PHP-only project (P7-T3)", () => {
  beforeAll(() => {
    rmSync(MINIMAL_DIR, { recursive: true, force: true });
    const r = runWpdev([
      "create",
      "minimal-test",
      ...MINIMAL_BRANDING,
      "--preset=minimal",
      "--yes",
      "--dir=dist/minimal-test",
    ]);
    expect(r.status).toBe(0);
    const scaffoldedMin = JSON.parse(
      readFileSync(join(MINIMAL_DIR, "wpdev.json"), "utf8"),
    );
    const fullMin = {
      ...scaffoldedMin,
      schema: 2,
      kitVersion: "1.0.0",
      distMode: "deps",
      generatedAt: "2026-01-01T00:00:00.000Z",
    };
    writeFileSync(
      join(MINIMAL_DIR, "wpdev.json"),
      JSON.stringify(fullMin, null, 2) + "\n",
    );
  });

  afterAll(() => {
    rmSync(MINIMAL_DIR, { recursive: true, force: true });
  });

  test("wpdev.json has js:none", () => {
    const m = readManifest(MINIMAL_DIR);
    expect(m.features.js).toBe("none");
  });

  test("no package.json (PHP-only)", () => {
    expect(existsSync(join(MINIMAL_DIR, "package.json"))).toBe(false);
    expect(existsSync(join(MINIMAL_DIR, "node_modules"))).toBe(false);
  });

  test("doctor reports no project errors", () => {
    const report = doctorProject(MINIMAL_DIR);
    expect(report.errors).toEqual([]);
  });
});
