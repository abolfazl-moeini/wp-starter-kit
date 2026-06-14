import { describe, test, expect, jest, beforeEach } from '@jest/globals';

beforeEach(() => { jest.resetModules(); });

describe('dirname', () => {
  test('dirname exists as a function', async () => {
    const { dirname } = await import('@core/utils');
    expect(typeof dirname).toBe('function');
  });
});
