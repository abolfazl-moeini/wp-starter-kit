import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

const ORIGINAL_ROOT_NAME = process.env.ROOT_NAME;

beforeEach(() => { jest.resetModules(); });
afterEach(() => { process.env.ROOT_NAME = ORIGINAL_ROOT_NAME; });

describe('getOrgName (via @core/utils mock)', () => {
  test('getOrgName is a function via @core/utils', async () => {
    const { getOrgName } = await import('@core/utils');
    expect(typeof getOrgName).toBe('function');
  });

  test('getOrgNameSync returns Testing from mock', async () => {
    const { getOrgNameSync } = await import('@core/utils');
    expect(getOrgNameSync()).toBe('Testing');
  });
});

describe('extractOrgName logic (regex)', () => {
  const ORG_REGEX = /^@([^/]+)\//;

  test('@acme/project extracts acme', () => {
    expect('@acme/project'.match(ORG_REGEX)[1]).toBe('acme');
  });

  test('unscoped name lodash returns null match', () => {
    expect('lodash'.match(ORG_REGEX)).toBeNull();
  });
});
