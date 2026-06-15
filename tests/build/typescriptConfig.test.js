/**
 * RED test: TypeScript configuration contract for the wp-starter-kit root.
 *
 * Asserts the post-p12 contract:
 *   1. tsconfig.json exists at the project root and is valid JSON.
 *   2. compilerOptions.strict is true and compilerOptions.target is "ES2020".
 *   3. compilerOptions.jsx is "react-jsx" (Preact uses the runtime JSX transform).
 *   4. compilerOptions.include (or compilerOptions.files) covers
 *      the assets/ and packages/ TypeScript source trees.
 *   5. package.json devDependencies include typescript, @types/node, @types/jest.
 *   6. package.json scripts.typecheck is defined.
 *   7. package.json scripts.test is defined (preserved from the pre-TS build).
 *   8. jest.config.mjs has a transform entry matching the JS/TS regex
 *      (babel-jest with @babel/preset-typescript, or ts-jest).
 *
 * The test reads files off disk; it does NOT import any SUT. That way it
 * fails RED in CI before the files exist, and passes GREEN once the config
 * files match the contract.
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, isAbsolute } from 'node:path';

const PROJECT_ROOT = resolve(__dirname, '..', '..');

function readJson(filePath) {
    const raw = readFileSync(filePath, 'utf8');
    try {
        return JSON.parse(raw);
    } catch (e) {
        throw new Error(`${filePath} is not valid JSON: ${e.message}`);
    }
}

function readIfExists(filePath) {
    if (!existsSync(filePath)) {
        return null;
    }
    return readJson(filePath);
}

function globListIncludes(include, pattern) {
    if (!Array.isArray(include)) {
        return false;
    }
    return include.some((entry) => typeof entry === 'string' && entry === pattern);
}

function filesListIncludes(files, pattern) {
    if (!Array.isArray(files)) {
        return false;
    }
    return files.some((entry) => typeof entry === 'string' && entry === pattern);
}

describe('TypeScript configuration contract (root)', () => {
    const tsconfigPath = join(PROJECT_ROOT, 'tsconfig.json');
    const packageJsonPath = join(PROJECT_ROOT, 'package.json');
    const jestConfigPath = join(PROJECT_ROOT, 'jest.config.mjs');

    let tsconfig;
    let packageJson;
    let jestConfigSource;

    beforeAll(() => {
        tsconfig = readIfExists(tsconfigPath);
        packageJson = readIfExists(packageJsonPath);
        jestConfigSource = existsSync(jestConfigPath) ? readFileSync(jestConfigPath, 'utf8') : null;
    });

    test('tsconfig.json exists at the project root and is valid JSON', () => {
        expect(existsSync(tsconfigPath)).toBe(true);
        // Must be parseable as a JSON object (readIfExists would have thrown otherwise).
        expect(tsconfig).not.toBeNull();
        expect(typeof tsconfig).toBe('object');
    });

    test('tsconfig.json enables strict mode and targets ES2020', () => {
        expect(tsconfig).not.toBeNull();
        expect(tsconfig.compilerOptions).toBeDefined();
        expect(tsconfig.compilerOptions.strict).toBe(true);
        expect(tsconfig.compilerOptions.target).toBe('ES2020');
    });

    test('tsconfig.json uses the automatic JSX runtime (react-jsx for Preact)', () => {
        expect(tsconfig).not.toBeNull();
        expect(tsconfig.compilerOptions).toBeDefined();
        expect(tsconfig.compilerOptions.jsx).toBe('react-jsx');
    });

    test('tsconfig.json includes assets/**/*.ts and packages/**/*.ts', () => {
        expect(tsconfig).not.toBeNull();

        const hasAssetsGlob = globListIncludes(tsconfig.include, 'assets/**/*.ts');
        const hasAssetsFiles = filesListIncludes(tsconfig.files, 'assets/**/*.ts');
        expect(hasAssetsGlob || hasAssetsFiles).toBe(true);

        const hasPackagesGlob = globListIncludes(tsconfig.include, 'packages/**/*.ts');
        const hasPackagesFiles = filesListIncludes(tsconfig.files, 'packages/**/*.ts');
        expect(hasPackagesGlob || hasPackagesFiles).toBe(true);
    });

    test('package.json declares typescript, @types/node, and @types/jest in devDependencies', () => {
        expect(packageJson).not.toBeNull();
        const dev = packageJson.devDependencies || {};
        expect(dev.typescript).toBeDefined();
        expect(typeof dev.typescript).toBe('string');
        expect(dev['@types/node']).toBeDefined();
        expect(typeof dev['@types/node']).toBe('string');
        expect(dev['@types/jest']).toBeDefined();
        expect(typeof dev['@types/jest']).toBe('string');
    });

    test('package.json defines a typecheck npm script', () => {
        expect(packageJson).not.toBeNull();
        const scripts = packageJson.scripts || {};
        expect(scripts.typecheck).toBeDefined();
        expect(typeof scripts.typecheck).toBe('string');
        expect(scripts.typecheck.length).toBeGreaterThan(0);
    });

    test('package.json preserves the existing test npm script', () => {
        expect(packageJson).not.toBeNull();
        const scripts = packageJson.scripts || {};
        expect(scripts.test).toBeDefined();
        expect(typeof scripts.test).toBe('string');
        expect(scripts.test.length).toBeGreaterThan(0);
    });

    test('jest.config.mjs has a transform entry covering .ts/.tsx files', () => {
        expect(jestConfigSource).not.toBeNull();
        // Match the .js/.jsx/.ts/.tsx transform key. babel-jest and ts-jest are both acceptable.
        // We assert BOTH that the regex key matches .ts/.tsx files AND that the transform value
        // is configured for TypeScript — either a babel-jest tuple containing
        // @babel/preset-typescript, or a ts-jest reference. This rules out the pre-p12
        // shorthand `"^.+\\.[jt]sx?$": "babel-jest"` which transforms .ts files as plain JS.
        const transformKeyPattern = /['"`][^'"`]*\[jt]sx\?\$['"`]\s*:/;
        const transformKeyMatch = jestConfigSource.match(transformKeyPattern);
        expect(transformKeyMatch).not.toBeNull();
        const hasPresetTypescript = jestConfigSource.includes('@babel/preset-typescript');
        const hasTsJest = /\bts-jest\b/.test(jestConfigSource);
        expect(hasPresetTypescript || hasTsJest).toBe(true);
    });
});
