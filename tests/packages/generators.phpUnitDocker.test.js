/**
 * phpUnitDocker generator — Docker PHPUnit stack for scaffolded plugins.
 */
import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { scaffoldProject } from "../../packages/create-wp-project/src/index.js";
import { run as phpUnitDockerRun } from "../../packages/create-wp-project/src/generators/phpUnitDocker.js";
import { defaultFeatures } from "../../packages/create-wp-project/src/features.js";
import { buildPromptPlan } from "../../packages/cli/src/prompts.js";

const goodAnswers = {
  slug: "my-project",
  npmScope: "myorg",
  globalName: "MyProject",
  localizeVar: "MyProjectLoc",
  textDomain: "my-project",
  hookPrefix: "my-project",
  depsBundle: "my-project-deps.js",
  phpFunctionPrefix: "myprj_",
  uiFramework: "preact",
};

describe("phpUnitDocker generator", () => {
  test("emits docker-phpunit files when on", () => {
    const out = phpUnitDockerRun({
      answers: goodAnswers,
      cfg: {},
      features: { phpTest: "phpunit", phpUnitDocker: "on" },
      vars: { slug: "my-project" },
    });
    expect(out.files["tests/docker-phpunit/docker-compose.yml"]).toBeDefined();
    expect(out.files["tests/docker-phpunit/env.example"]).toMatch(/my-project/);
    expect(out.files["tests/docker-phpunit/run-phpunit.sh"]).toMatch(
      /docker compose up/,
    );
    expect(out.files["tests/docker-phpunit/teardown.sh"]).toBeDefined();
    expect(
      out.files["tests/docker-phpunit/wp-tests-config.php.template"],
    ).toMatch(/DB_HOST/);
    expect(out.composerPatches.scripts["test:docker"]).toMatch(
      /run-phpunit\.sh/,
    );
  });

  test("docker image follows features.phpMinVersion", () => {
    const out = phpUnitDockerRun({
      answers: goodAnswers,
      cfg: { phpMinVersion: "7.4" },
      features: {
        phpTest: "phpunit",
        phpUnitDocker: "on",
        phpMinVersion: "8.2",
      },
      vars: { slug: "my-project" },
    });
    expect(out.files["tests/docker-phpunit/docker-compose.yml"]).toContain(
      "wordpress:php8.2-apache",
    );
    expect(out.files["tests/docker-phpunit/env.example"]).toContain(
      "wordpress:php8.2-apache",
    );
  });

  test("emits nothing when off", () => {
    const out = phpUnitDockerRun({
      answers: goodAnswers,
      features: { phpTest: "phpunit", phpUnitDocker: "off" },
      vars: {},
    });
    expect(Object.keys(out.files)).toEqual([]);
  });
});

describe("phpUnitDocker scaffold + prompts", () => {
  let tmp;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-phpunit-docker-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("scaffold with phpUnitDocker:on writes tests/docker-phpunit", async () => {
    const res = await scaffoldProject(tmp, goodAnswers, {
      features: {
        ...defaultFeatures(),
        phpTest: "phpunit",
        phpUnitDocker: "on",
      },
    });
    expect(res.ok).toBe(true);
    await expect(
      fs.stat(path.join(tmp, "tests/docker-phpunit/run-phpunit.sh")),
    ).resolves.toBeTruthy();
    const composer = JSON.parse(
      await fs.readFile(path.join(tmp, "composer.json"), "utf8"),
    );
    expect(composer.scripts["test:docker"]).toBeDefined();
  });

  test("prompt plan asks phpUnitDocker only when phpTest is phpunit", () => {
    const plan = buildPromptPlan(defaultFeatures());
    const q = plan.find((item) => item.id === "phpUnitDocker");
    expect(q).toBeDefined();
    const custom = { runOptions: { preset: "custom" }, features: {} };
    expect(q.when({ ...custom, features: { phpTest: "phpunit" } })).toBe(true);
    expect(q.when({ ...custom, features: { phpTest: "none" } })).toBe(false);
  });
});
