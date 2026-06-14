import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import mockFs from 'mock-fs';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const validConfig = {
  slug: 'my-project',
  globalName: 'MyProject',
  localizeVar: 'MyProjectLoc',
  textDomain: 'my-project',
  hookPrefix: 'my-project',
  npmScope: '@my-org',
};

const ORIGINAL_ROOT_NAME = process.env.ROOT_NAME;
const ROOT = '/mock/root';

function checkProjectWithDeps({ readProjectConfig, getRootPath }) {
  const issues = [];

  try {
    const config = readProjectConfig();
    if (!config.npmScope && !config.slug) {
      issues.push('project.config.json must have npmScope or slug');
    }
  } catch (e) {
    issues.push(e.message);
  }

  if (!process.env.ROOT_NAME) {
    try {
      const pkgPath = join(getRootPath(), 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
        if (!pkg.name || !pkg.name.startsWith('@')) {
          issues.push('ROOT_NAME env not set and package.json name is not scoped (@org/pkg)');
        }
      }
    } catch {
      issues.push('Could not read root package.json');
    }
  }

  return issues;
}

function createCheckProject() {
  const readProjectConfig = () => {
    const configPath = join(ROOT, 'project.config.json');
    if (!existsSync(configPath)) {
      throw new Error(`project.config.json not found at: ${configPath}`);
    }
    return JSON.parse(readFileSync(configPath, 'utf8'));
  };

  return () => checkProjectWithDeps({
    readProjectConfig,
    getRootPath: () => ROOT,
  });
}

beforeEach(() => {
  process.env.ROOT_NAME = ORIGINAL_ROOT_NAME;
});

afterEach(() => {
  mockFs.restore();
  process.env.ROOT_NAME = ORIGINAL_ROOT_NAME;
});

describe('checkProject', () => {
  test('returns empty array when project.config.json is valid and package is scoped', () => {
    mockFs({
      [ROOT]: {
        'project.config.json': JSON.stringify(validConfig),
        'package.json': JSON.stringify({ name: '@my-org/starter' }),
      },
    });

    expect(createCheckProject()()).toEqual([]);
  });

  test('returns error when project.config.json is missing', () => {
    mockFs({
      [ROOT]: {
        'package.json': JSON.stringify({ name: '@my-org/starter' }),
      },
    });

    const issues = createCheckProject()();
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toMatch(/project\.config\.json not found/);
  });

  test('returns error when package.json name is unscoped and ROOT_NAME is unset', () => {
    delete process.env.ROOT_NAME;

    mockFs({
      [ROOT]: {
        'project.config.json': JSON.stringify(validConfig),
        'package.json': JSON.stringify({ name: 'unscoped-starter' }),
      },
    });

    const issues = createCheckProject()();
    expect(issues).toContain('ROOT_NAME env not set and package.json name is not scoped (@org/pkg)');
  });

  test('skips package.json scope check when ROOT_NAME is set', () => {
    process.env.ROOT_NAME = '@env/org';

    mockFs({
      [ROOT]: {
        'project.config.json': JSON.stringify(validConfig),
        'package.json': JSON.stringify({ name: 'unscoped-starter' }),
      },
    });

    expect(createCheckProject()()).toEqual([]);
  });
});