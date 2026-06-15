import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import mockFs from "mock-fs";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { checkProject } from "@core/utils/check.js";

const validConfig = {
  slug: "my-project",
  globalName: "MyProject",
  localizeVar: "MyProjectLoc",
  textDomain: "my-project",
  hookPrefix: "my-project",
  npmScope: "@my-org",
};

const ORIGINAL_ROOT_NAME = process.env.ROOT_NAME;
const ROOT = "/mock/root";

function createDeps() {
  const readProjectConfig = () => {
    const configPath = join(ROOT, "project.config.json");
    if (!existsSync(configPath)) {
      throw new Error(`project.config.json not found at: ${configPath}`);
    }
    return JSON.parse(readFileSync(configPath, "utf8"));
  };

  return {
    readProjectConfig,
    getRootPath: () => ROOT,
  };
}

beforeEach(() => {
  process.env.ROOT_NAME = ORIGINAL_ROOT_NAME;
});

afterEach(() => {
  mockFs.restore();
  process.env.ROOT_NAME = ORIGINAL_ROOT_NAME;
});

describe("checkProject", () => {
  test("returns empty array when project.config.json is valid and package is scoped", () => {
    mockFs({
      [ROOT]: {
        "project.config.json": JSON.stringify(validConfig),
        "package.json": JSON.stringify({ name: "@my-org/starter" }),
      },
    });

    expect(checkProject(createDeps())).toEqual([]);
  });

  test("returns error when project.config.json is missing", () => {
    mockFs({
      [ROOT]: {
        "package.json": JSON.stringify({ name: "@my-org/starter" }),
      },
    });

    const issues = checkProject(createDeps());
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toMatch(/project\.config\.json not found/);
  });

  test("returns error when package.json name is unscoped and ROOT_NAME is unset", () => {
    delete process.env.ROOT_NAME;

    mockFs({
      [ROOT]: {
        "project.config.json": JSON.stringify(validConfig),
        "package.json": JSON.stringify({ name: "unscoped-starter" }),
      },
    });

    const issues = checkProject(createDeps());
    expect(issues).toContain(
      "ROOT_NAME env not set and package.json name is not scoped (@org/pkg)",
    );
  });

  test("skips package.json scope check when ROOT_NAME is set", () => {
    process.env.ROOT_NAME = "@env/org";

    mockFs({
      [ROOT]: {
        "project.config.json": JSON.stringify(validConfig),
        "package.json": JSON.stringify({ name: "unscoped-starter" }),
      },
    });

    expect(checkProject(createDeps())).toEqual([]);
  });
});
