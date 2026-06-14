/** @jest-environment jsdom */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { localize } from '../../packages/utils/localize.js';

beforeEach(() => {
  globalThis.WPSKLoc = {
    api: { url: 'https://api.example.test', nonce: 'abc123' },
    api_x: { url: 'https://api-x.example.test', nonce: 'xyz789' },
    a: { b: { c: 'deep-value' } },
    translate: { greeting: 'Hello' },
  };
});

describe('localize', () => {
  test("get('api.url') returns nested value", () => {
    expect(localize.get('api.url')).toBe('https://api.example.test');
  });

  test("get('api_x.nonce') returns 2-level dot notation value", () => {
    expect(localize.get('api_x.nonce')).toBe('xyz789');
  });

  test("get('a.b.c') returns deeply nested value", () => {
    expect(localize.get('a.b.c')).toBe('deep-value');
  });

  test("get('missing') returns undefined", () => {
    expect(localize.get('missing')).toBeUndefined();
  });

  test("translate('greeting') reads translate.* keys", () => {
    expect(localize.translate('greeting')).toBe('Hello');
  });
});