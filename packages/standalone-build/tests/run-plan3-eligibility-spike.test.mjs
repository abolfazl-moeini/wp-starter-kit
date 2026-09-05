import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runPlan3EligibilitySpike } from "../run-plan3-eligibility-spike.mjs";

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "plan3-spike-test-"));
  await mkdir(path.join(root, "src"), { recursive: true });

  await writeFile(
    path.join(root, "plugin.php"),
    "<?php\nadd_action('init', function() { wpdev_v2_settings(); });",
    "utf8"
  );
  await writeFile(
    path.join(root, "src/PrivateModule.php"),
    "<?php\nclass PrivateModule { private function internalCalc() { return 42; } }",
    "utf8"
  );

  return root;
}

test("accepts a clean codebase without forbidden execution patterns", async () => {
  const root = await createFixture();
  try {
    const report = await runPlan3EligibilitySpike({ rootDir: root });
    assert.equal(report.status, "ready");
    assert.equal(report.forbiddenPatterns.length, 0);
    assert.ok(report.totalFiles >= 2);
    assert.ok(report.eligibleFiles.length >= 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("detects and rejects eval() usage in code", async () => {
  const root = await createFixture();
  try {
    await writeFile(path.join(root, "src/Bad.php"), "<?php eval('echo 1;');", "utf8");
    const report = await runPlan3EligibilitySpike({ rootDir: root });
    assert.equal(report.status, "blocked");
    assert.ok(report.forbiddenPatterns.some((p) => p.pattern === "eval"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("detects and rejects create_function() usage", async () => {
  const root = await createFixture();
  try {
    await writeFile(path.join(root, "src/Bad2.php"), "<?php $f = create_function('', 'echo 1;');", "utf8");
    const report = await runPlan3EligibilitySpike({ rootDir: root });
    assert.equal(report.status, "blocked");
    assert.ok(report.forbiddenPatterns.some((p) => p.pattern === "create_function"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("detects and rejects string assert() expressions", async () => {
  const root = await createFixture();
  try {
    await writeFile(path.join(root, "src/Bad3.php"), "<?php assert('1 === 1');", "utf8");
    const report = await runPlan3EligibilitySpike({ rootDir: root });
    assert.equal(report.status, "blocked");
    assert.ok(report.forbiddenPatterns.some((p) => p.pattern === "string_assert"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects dynamic include and callable edges", async () => {
  const root = await createFixture();
  try {
    await writeFile(path.join(root, "src/Dynamic.php"), "<?php require $path; call_user_func($handler);", "utf8");
    const report = await runPlan3EligibilitySpike({ rootDir: root });
    assert.equal(report.status, "blocked");
    assert.ok(report.forbiddenPatterns.some((p) => p.pattern === "dynamic_include"));
    assert.ok(report.forbiddenPatterns.some((p) => p.pattern === "dynamic_callable"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("records reflection, class_exists strings, and serialize as dynamic-name edges", async () => {
  const root = await createFixture();
  try {
    await writeFile(
      path.join(root, "src/DynamicNames.php"),
      "<?php\n$r = new ReflectionClass($name);\nclass_exists('App\\\\Hidden');\nunserialize($blob);\n",
      "utf8",
    );
    const report = await runPlan3EligibilitySpike({ rootDir: root });
    assert.equal(report.status, "blocked");
    assert.ok(report.forbiddenPatterns.some((p) => p.pattern === "reflection"));
    assert.ok(report.forbiddenPatterns.some((p) => p.pattern === "class_exists_string"));
    assert.ok(report.forbiddenPatterns.some((p) => p.pattern === "serialize_callback"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
