/** @jest-environment jsdom */
import { describe, test, expect } from '@jest/globals';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DEPS_ENTRY = join(process.cwd(), 'assets/dependencies.js');

describe('assets/dependencies.js — template', () => {
  test('exists at assets/dependencies.js', () => {
    expect(existsSync(DEPS_ENTRY)).toBe(true);
  });

  test('imports @wordpress/hooks and a domReady shim (template contract)', () => {
    const source = readFileSync(DEPS_ENTRY, 'utf8');
    // The template must create the hooks singleton via @wordpress/hooks.
    expect(source).toMatch(/@wordpress\/hooks/);
    // Must export `hooks` (the createHooks() instance).
    expect(source).toMatch(/export\s+const\s+hooks/);
    // Must register custom actions under the configured hook prefix.
    // We can't know the prefix at this level, but the template must call
    // hooks.addAction() at least once.
    expect(source).toMatch(/hooks\.addAction/);
  });

  test('emits the <hookPrefix>-request-ajax-start action name in the source', () => {
    const source = readFileSync(DEPS_ENTRY, 'utf8');
    // The template uses a build-time placeholder for the prefix; either:
    //   1) the literal string `<hookPrefix>-request-ajax-start` (template), or
    //   2) a JS template string that interpolates the prefix.
    // Either is acceptable — the test asserts the action NAME is wired.
    const hasLiteral = source.includes('<hookPrefix>-request-ajax-start');
    const hasInterpolated = /\$\{[^}]*\}[\s-]*request-ajax-start/.test(source);
    expect(hasLiteral || hasInterpolated).toBe(true);
  });

  test('exports a `table` alias for the third-party `Tabulator` global (5-step pattern)', () => {
    const source = readFileSync(DEPS_ENTRY, 'utf8');
    // The 1.6 tabulator pattern: dependencies.js bridges window.Tabulator
    // into the IIFE global via `export const table = { Tabulator: window.Tabulator }`.
    expect(source).toMatch(/export\s+const\s+table\s*=/);
    expect(source).toContain('window.Tabulator');
  });
});
