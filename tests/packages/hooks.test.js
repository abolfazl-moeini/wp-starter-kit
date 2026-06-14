/** @jest-environment jsdom */
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import mockFs from 'mock-fs';
import { join } from 'node:path';
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';

// Strategy: tests use the REAL `readProjectConfig` (provided via the global
// @core/utils mock in tests/jest.setup.js, which reads project.config.json
// from disk). We manipulate a temporary project.config.json for the
// "config-driven" case, and restore the original in afterEach.

const CONFIG_PATH = join(process.cwd(), 'project.config.json');
let originalConfig = null;

function readOriginal() {
  if (existsSync(CONFIG_PATH)) {
    originalConfig = readFileSync(CONFIG_PATH, 'utf8');
  }
}

function writeConfig(config) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function restoreConfig() {
  if (originalConfig !== null) {
    writeFileSync(CONFIG_PATH, originalConfig);
  } else if (existsSync(CONFIG_PATH)) {
    unlinkSync(CONFIG_PATH);
  }
  mockFs.restore();
}

let hooks;

beforeEach(async () => {
  jest.resetModules();
  readOriginal();
  delete globalThis.WPSK;
  delete globalThis.MyApp;
  hooks = await import('../../packages/hooks/index.js');
});

afterEach(() => {
  restoreConfig();
});

describe('@wpsk/hooks', () => {
  test('exports a default accessor function (default export is callable)', () => {
    // The package must expose either a default or named `getHooks` export.
    const accessor = hooks.default ?? hooks.getHooks;
    expect(accessor).toBeDefined();
    expect(typeof accessor).toBe('function');
  });

  test('returns undefined when the global namespace is not set on window', () => {
    const accessor = hooks.default ?? hooks.getHooks;
    const hooksValue = accessor();
    expect(hooksValue).toBeUndefined();
  });

  test('returns the hooks object when the global namespace is set', () => {
    const fakeHooks = { doAction: () => {}, addAction: () => {} };
    globalThis.WPSK = { hooks: fakeHooks };

    const accessor = hooks.default ?? hooks.getHooks;
    expect(accessor()).toBe(fakeHooks);
  });

  test('reads globalName from project.config.json (config-driven, not hardcoded)', () => {
    // The default project.config.json has globalName: 'WPSK'.
    // We mutate it to 'MyApp' to prove the lookup is config-driven.
    writeConfig({
      slug: 'my-app',
      globalName: 'MyApp',
      localizeVar: 'MyAppLoc',
      textDomain: 'my-app',
      hookPrefix: 'myapp',
      npmScope: '@my-org',
      depsBundle: 'my-app-deps.js',
    });
    globalThis.MyApp = { hooks: { tag: 'from-my-app' } };

    // Resolve again — but the module was already imported in beforeEach.
    // Calling the accessor re-reads config (per-call) so this works.
    const accessor = hooks.default ?? hooks.getHooks;
    const hooksValue = accessor();
    expect(hooksValue).toEqual({ tag: 'from-my-app' });
  });

  test('getHooks(globalName) accepts an explicit override', () => {
    globalThis.AnotherApp = { hooks: { tag: 'override' } };
    expect(hooks.getHooks('AnotherApp')).toEqual({ tag: 'override' });
  });
});
