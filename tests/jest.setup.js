import {jest} from '@jest/globals';
import {dirname, resolve} from "node:path";

jest.mock('@core/utils', () => {
    const {resolve, dirname} = require('node:path');

    const rootDir = process.cwd();

    return {
        getMetaUrl: jest.fn(() => resolve(rootDir, 'core/packages/utils/path.js')),
        getRootPath: jest.fn(() => rootDir),
        getOrgName: jest.fn(() => 'Testing'),
        getOrgNameSync: jest.fn(() => 'Testing'),
        dirname: jest.fn(() => '/mock/dirname'),
    };
});

