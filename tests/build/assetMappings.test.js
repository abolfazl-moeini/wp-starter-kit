import {expect, jest, test, beforeEach, describe} from '@jest/globals';
import {validateConfig} from "@core/build"

jest.unstable_mockModule('node:fs/promises', () => ({
    cp: jest.fn(),
}));
beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
});

describe('validateConfig with mock config', () => {

    test('ignores extra properties in mappings', () => {
        const configWithExtras = {
            assetMappings: [
                {
                    source: 'mock/source',
                    destination: 'mock/dest',
                    extra: 'ignored', // Shouldn't break validation
                    options: {overwrite: true},
                },
            ],
        };
        expect(() => validateConfig(configWithExtras)).not.toThrow();
    });

    test('throws error if assetMappings is missing', () => {
        const invalidConfig = {};
        expect(() => validateConfig(invalidConfig)).toThrow('assetMappings must be an array');
    });

    test('accepts an empty assetMappings array', () => {
        const emptyConfig = {assetMappings: []};
        expect(() => validateConfig(emptyConfig)).not.toThrow();
        expect(emptyConfig.assetMappings).toHaveLength(0);
    });

    test('throws error if assetMappings is not an array', () => {
        const assetMappings = {};
        expect(() => validateConfig({assetMappings})).toThrow('assetMappings must be an array');
    });

    test('throws error on missing source or destination', () => {
        const invalidConfig = {
            assetMappings: [
                {destination: 'mock/dest'}, // Missing source
                {source: 'mock/source'},    // Missing destination
            ],
        };
        expect(() => validateConfig(invalidConfig)).toThrow('Each assetMapping requires source and destination');
    });

    test('throws error on non-string source or destination', () => {
        const invalidConfig = {
            assetMappings: [
                {source: 123, destination: 'mock/dest'},
                {source: 'mock/source', destination: null},
            ],
        };
        expect(() => validateConfig(invalidConfig)).toThrow('source and destination must be strings');
    });

    test('throws error on invalid options type', () => {
        const invalidConfig = {
            assetMappings: [
                {source: 'mock/source', destination: 'mock/dest', options: 'not-an-object'},
            ],
        };
        expect(() => validateConfig(invalidConfig)).toThrow('options must be an object if present');
    });
});

