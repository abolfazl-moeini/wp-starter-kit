import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { execFileSync, spawnSync } from "node:child_process";

const tool = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../validate-test-portability-manifest.mjs",
);

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value)}\n`);
}

async function fixture(overrides = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "test-portability-"));
  const plugin = path.join(root, "plugins", "tavangary-demo");
  await mkdir(path.join(plugin, "tests", "unit-tests"), { recursive: true });
  await mkdir(path.join(plugin, "tests", "e2e", "specs"), { recursive: true });
  await writeFile(path.join(plugin, "tests", "unit-tests", "DemoTest.php"), "<?php\n");
  await writeFile(path.join(plugin, "tests", "e2e", "specs", "demo.spec.js"), "export {};\n");
  execFileSync("git", ["init"], { cwd: plugin });
  execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: plugin });
  execFileSync("git", ["config", "user.name", "Portability Test"], { cwd: plugin });
  execFileSync("git", ["add", "tests"], { cwd: plugin });
  execFileSync("git", ["commit", "-m", "test source"], { cwd: plugin });
  const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: plugin, encoding: "utf8" }).trim();
  const manifest = {
    schema: 1,
    status: "draft-blocked",
    plugin: "tavangary-demo",
    sourceCommit,
    rules: {
      "source-internal": "source suite",
      "portable-contract": "external runner",
      "artifact-e2e": "candidate zip",
      "harness-only": "not shipped",
      "live/external": "sandbox-only third-party network tests",
    },
    tests: {
      "source-internal": ["tests/unit-tests/DemoTest.php"],
      "portable-contract": [],
      "artifact-e2e": ["tests/e2e/specs/demo.spec.js"],
      "harness-only": [],
    },
    criticalBehaviorCoverage: {
      smoke: {
        source: ["tests/unit-tests/DemoTest.php"],
        artifact: ["tests/e2e/specs/demo.spec.js"],
        status: "mapped",
      },
    },
    promotionBlockers: ["Exact ZIP has not been built."],
    ...overrides,
  };
  const manifestPath = path.join(plugin, "dev", "test-portability-manifest.json");
  await writeJson(manifestPath, manifest);
  return { root, manifestPath };
}

test("accepts complete draft portability evidence without treating it as promotion ready", async () => {
  const { root } = await fixture();
  try {
    const result = spawnSync(process.execPath, [tool, root, "tavangary-demo"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.status, "valid-review-evidence");
    assert.equal(report.promotionReady, false);
    assert.equal(report.classifiedTests, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports classified harness paths separately from discovered test files", async () => {
  const { root } = await fixture({
    tests: {
      "source-internal": ["tests/unit-tests/DemoTest.php"],
      "portable-contract": [],
      "artifact-e2e": ["tests/e2e/specs/demo.spec.js"],
      "harness-only": ["tests/support/runner.php"],
    },
  });
  try {
    await mkdir(path.join(root, "plugins", "tavangary-demo", "tests", "support"), { recursive: true });
    await writeFile(path.join(root, "plugins", "tavangary-demo", "tests", "support", "runner.php"), "<?php\n");
    const result = spawnSync(process.execPath, [tool, root, "tavangary-demo"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.discoveredTests, 2);
    assert.equal(report.classifiedTests, 3);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects a portability manifest whose declared source commit is not resolvable", async () => {
  const { root } = await fixture({ sourceCommit: "0123456" });
  try {
    const result = spawnSync(process.execPath, [tool, root, "tavangary-demo"], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /sourceCommit does not resolve to a commit/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects missing, duplicate, unsafe, and symlinked portability evidence", async () => {
  const { root, manifestPath } = await fixture({
    tests: {
      "source-internal": ["tests/unit-tests/DemoTest.php", "tests/unit-tests/DemoTest.php"],
      "portable-contract": ["../outside.php"],
      "artifact-e2e": [],
      "harness-only": [],
    },
  });
  try {
    const result = spawnSync(process.execPath, [tool, root, "tavangary-demo"], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /classified more than once/);
    assert.match(result.stdout, /unsafe test path/);
    assert.match(result.stdout, /is missing from tests classification/);

    const target = `${manifestPath}.target`;
    await writeFile(target, await readFile(manifestPath));
    await unlink(manifestPath);
    await symlink(target, manifestPath);
    const symlinked = spawnSync(process.execPath, [tool, root, "tavangary-demo"], { encoding: "utf8" });
    assert.equal(symlinked.status, 1);
    assert.match(symlinked.stdout, /symlink evidence path is not allowed/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("accepts live/external classification without treating it as promotion ready", async () => {
  const { root } = await fixture({
    tests: {
      "source-internal": ["tests/unit-tests/DemoTest.php"],
      "portable-contract": [],
      "artifact-e2e": ["tests/e2e/specs/demo.spec.js"],
      "harness-only": [],
      "live/external": ["tests/e2e/specs/live-drm.spec.js"],
    },
  });
  try {
    await writeFile(
      path.join(root, "plugins", "tavangary-demo", "tests", "e2e", "specs", "live-drm.spec.js"),
      "export {};\n",
    );
    const result = spawnSync(process.execPath, [tool, root, "tavangary-demo"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.status, "valid-review-evidence");
    assert.equal(report.promotionReady, false);
    assert.equal(report.discoveredTests, 3);
    assert.equal(report.classifiedTests, 3);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects critical behavior mappings that are not classified in their required target", async () => {
  const { root } = await fixture({
    criticalBehaviorCoverage: {
      smoke: {
        source: ["tests/e2e/specs/demo.spec.js"],
        artifact: ["tests/unit-tests/DemoTest.php"],
        status: "mapped",
      },
    },
  });
  try {
    const result = spawnSync(process.execPath, [tool, root, "tavangary-demo"], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /source mapping must reference a source-internal test/);
    assert.match(result.stdout, /artifact mapping must reference artifact-e2e or portable-contract test/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("accepts a portable contract as artifact evidence for a critical behavior", async () => {
  const { root } = await fixture({
    tests: {
      "source-internal": ["tests/unit-tests/DemoTest.php"],
      "portable-contract": ["tests/contracts/PortableDemoTest.php"],
      "artifact-e2e": ["tests/e2e/specs/demo.spec.js"],
      "harness-only": [],
    },
    criticalBehaviorCoverage: {
      smoke: {
        source: ["tests/unit-tests/DemoTest.php"],
        artifact: ["tests/contracts/PortableDemoTest.php"],
        status: "mapped",
      },
    },
  });
  try {
    await mkdir(path.join(root, "plugins", "tavangary-demo", "tests", "contracts"), { recursive: true });
    await writeFile(path.join(root, "plugins", "tavangary-demo", "tests", "contracts", "PortableDemoTest.php"), "<?php\n");
    const result = spawnSync(process.execPath, [tool, root, "tavangary-demo"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout);
    const report = JSON.parse(result.stdout);
    assert.equal(report.status, "valid-review-evidence");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
