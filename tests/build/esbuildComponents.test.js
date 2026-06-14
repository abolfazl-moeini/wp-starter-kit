import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('esbuild-components', () => {
  test('uses Promise.all to await parallel component builds', () => {
    const source = readFileSync(
      join(process.cwd(), 'core/packages/build/esbuild-components.js'),
      'utf8',
    );

    expect(source).toContain('await Promise.all(jsfiles.map');
  });
});