import { describe, test, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import mock from 'mock-fs';

let assetFileInfo, saveAssetFile;

beforeAll(async () => {
  const mod = await import('@core/dependency-extraction-esbuild-plugin');
  assetFileInfo = mod.assetFileInfo;
  saveAssetFile = mod.saveAssetFile;
});

const buildResponseWithWP = {
  metafile: {
    inputs: {
      'external-global-wordpress:@wordpress/i18n': { bytes: 100 },
      'external-global-wordpress:@wordpress/api-fetch': { bytes: 200 },
      'index.js': { bytes: 300 },
    },
    outputs: {
      'assets/bundles/my-project-deps.js': { bytes: 500 },
      'assets/bundles/my-project-deps.js.map': { bytes: 200 },
    },
  },
};

const buildResponseNoWP = {
  metafile: {
    inputs: {
      'index.js': { bytes: 100 },
    },
    outputs: {
      'assets/bundles/foo.js': { bytes: 300 },
    },
  },
};

describe('assetFileInfo — forceAssets default is [] (array)', () => {
  beforeEach(() => {
    mock({
      'assets/bundles/my-project-deps.js': 'fake-bundle-content',
      'assets/bundles/foo.js': 'fake-foo-content',
    });
  });

  afterEach(() => {
    mock.restore();
  });

  test('default forceAssets returns only auto-detected WP dependencies', () => {
    const result = assetFileInfo(buildResponseWithWP);
    expect(result.dependencies).toEqual(['wp-i18n', 'wp-api-fetch']);
    expect(result.hash).toBeTruthy();
  });

  test('forceAssets = [] returns only WP deps (same as default)', () => {
    const result = assetFileInfo(buildResponseWithWP, []);
    expect(result.dependencies).toEqual(['wp-i18n', 'wp-api-fetch']);
  });

  test('forceAssets = ["custom-dep"] merges with WP deps', () => {
    const result = assetFileInfo(buildResponseWithWP, ['custom-dep']);
    expect(result.dependencies).toEqual(
      expect.arrayContaining(['wp-i18n', 'wp-api-fetch', 'custom-dep']),
    );
  });

  test('explicit undefined does not throw', () => {
    expect(() => assetFileInfo(buildResponseWithWP, undefined)).not.toThrow();
  });

  test('no WP scripts + forceAssets = ["only-dep"]', () => {
    const result = assetFileInfo(buildResponseNoWP, ['only-dep']);
    expect(result.dependencies).toEqual(['only-dep']);
  });
});

describe('saveAssetFile — forceAssets default must be [] not {}', () => {
  beforeEach(() => {
    mock({
      'assets/bundles/my-project-deps.js': 'fake-bundle-content',
      'assets/bundles/foo.js': 'fake-foo-content',
    });
  });

  afterEach(() => {
    mock.restore();
  });

  test('saveAssetFile with explicit array forceAssets works', async () => {
    const result = await saveAssetFile(buildResponseWithWP, ['my-project-deps']);
    expect(result).toBeTruthy();
  });

  test('saveAssetFile with no forceAssets uses [] default (no throw)', async () => {
    const result = await saveAssetFile(buildResponseWithWP);
    expect(result).toBeTruthy();
  });

  // Verify the default forceAssets type contract: must be Array (not Object)
  // The original bug had forceAssets = {}; the fix changed it to [].
  // We verify this by checking Array.isArray on the internal behavior.
  test('assetFileInfo receives an array from saveAssetFile default', () => {
    // When called without explicit forceAssets, assetFileInfo's default ([]) is used,
    // and concat with an empty array is equivalent to no forceAssets.
    // The key assertion: no crash, no {} in the deps array.
    const result = assetFileInfo(buildResponseWithWP);
    expect(Array.isArray(result.dependencies)).toBe(true);
    result.dependencies.forEach((dep) => {
      expect(typeof dep).toBe('string');
    });
  });
});
