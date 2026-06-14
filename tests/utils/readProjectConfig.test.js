import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import mockFs from 'mock-fs';

const validConfig = {
  slug: 'my-project', globalName: 'MyProject', localizeVar: 'MyProjectLoc',
  textDomain: 'my-project', hookPrefix: 'my-project', npmScope: '@my-org',
};
const minimal = {
  slug: 'test', globalName: 'Test', localizeVar: 'TestLoc',
  textDomain: 'test', hookPrefix: 'test', npmScope: '@test',
};

beforeEach(() => { jest.resetModules(); });
afterEach(() => { mockFs.restore(); });

describe('readProjectConfig', () => {
  test('reads JSON via custom path', async () => {
    mockFs({ '/tmp/a.json': JSON.stringify(validConfig) });
    const { readProjectConfig } = await import('@core/utils');
    const result = readProjectConfig({ path: '/tmp/a.json' });
    expect(result).toMatchObject(validConfig);
  });

  test('throws if required fields missing', async () => {
    mockFs({ '/tmp/b.json': JSON.stringify({ slug: 'only' }) });
    const { readProjectConfig } = await import('@core/utils');
    expect(() => readProjectConfig({ path: '/tmp/b.json' })).toThrow(/slug|globalName|localizeVar|textDomain|hookPrefix|npmScope/);
  });

  test('returns parsed when all fields present', async () => {
    mockFs({ '/tmp/c.json': JSON.stringify(minimal) });
    const { readProjectConfig } = await import('@core/utils');
    const result = readProjectConfig({ path: '/tmp/c.json' });
    expect(result.slug).toBe('test');
  });

  test('custom path works', async () => {
    mockFs({ '/special/config.json': JSON.stringify(validConfig) });
    const { readProjectConfig } = await import('@core/utils');
    const result = readProjectConfig({ path: '/special/config.json' });
    expect(result.slug).toBe('my-project');
  });

  test('malformed JSON', async () => {
    mockFs({ '/tmp/d.json': '{ bad }' });
    const { readProjectConfig } = await import('@core/utils');
    expect(() => readProjectConfig({ path: '/tmp/d.json' })).toThrow(/malformed|invalid JSON|parse/);
  });

  test('missing file', async () => {
    mockFs({});
    const { readProjectConfig } = await import('@core/utils');
    expect(() => readProjectConfig({ path: '/nope.json' })).toThrow(/not found/);
  });

  test('applies defaults for optional fields when omitted', async () => {
    mockFs({ '/tmp/defaults.json': JSON.stringify(minimal) });
    const { readProjectConfig } = await import('@core/utils');
    const result = readProjectConfig({ path: '/tmp/defaults.json' });
    expect(result.depsBundle).toBe('test-deps.js');
    expect(result.phpFunctionPrefix).toBe('wpsk_');
    expect(result.uiFramework).toBe('preact');
  });

  test('explicit optional values override defaults', async () => {
    const withOptionals = {
      ...minimal,
      depsBundle: 'custom-deps.js',
      phpFunctionPrefix: 'custom_',
      uiFramework: 'react',
    };
    mockFs({ '/tmp/override.json': JSON.stringify(withOptionals) });
    const { readProjectConfig } = await import('@core/utils');
    const result = readProjectConfig({ path: '/tmp/override.json' });
    expect(result.depsBundle).toBe('custom-deps.js');
    expect(result.phpFunctionPrefix).toBe('custom_');
    expect(result.uiFramework).toBe('react');
  });
});
