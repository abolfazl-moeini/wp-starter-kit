import {jest} from '@jest/globals';

jest.mock('@core/utils', () => {
    const rootDir = process.cwd();
    const REQUIRED_FIELDS = ['slug', 'globalName', 'localizeVar', 'textDomain', 'hookPrefix', 'npmScope'];

    return {
        getMetaUrl: jest.fn(() => rootDir + '/core/packages/utils/path.js'),
        getRootPath: jest.fn(() => rootDir),
        getOrgName: jest.fn(() => 'Testing'),
        getOrgNameSync: jest.fn(() => 'Testing'),
        dirname: jest.fn(() => '/mock/dirname'),
        readProjectConfig: ({ path: customPath } = {}) => {
            const { existsSync, readFileSync } = require('node:fs');
            const { resolve } = require('node:path');
            const configPath = customPath || resolve(rootDir, 'project.config.json');
            if (!existsSync(configPath)) {
                throw new Error('project.config.json not found at: ' + configPath);
            }
            try {
                const raw = readFileSync(configPath, 'utf8');
                const config = JSON.parse(raw);
                const missing = REQUIRED_FIELDS.filter((f) => !config[f]);
                if (missing.length > 0) {
                    throw new Error('project.config.json is missing required fields: ' + missing.join(', '));
                }
                const defaults = {
                    depsBundle: `${config.slug}-deps.js`,
                    phpFunctionPrefix: 'wpsk_',
                    uiFramework: 'preact',
                };
                return { ...defaults, ...config };
            } catch (e) {
                if (e instanceof SyntaxError) {
                    throw new Error('project.config.json is malformed or invalid JSON: ' + e.message);
                }
                throw e;
            }
        },
    };
});