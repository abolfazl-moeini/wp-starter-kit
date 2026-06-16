/**
 * @wpsk/create-wp-project — jsTest generator (Phase 21 / 25.D).
 *
 * Emits the JS unit-test runner config for the consumer:
 *   - jsTest:jest   → jest.config.mjs (default)
 *   - jsTest:vitest → vitest.config.ts|js (no jest config)
 *   - jsTest:none   → no files (registry filters it out)
 *
 * The `package.json` `scripts.test` + runner devDeps are
 * owned by `packageJsonForAnswers()` in `_templates.js`;
 * this generator only ships the runner-specific config file.
 */

const JEST_CONFIG = `export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\\\.[jt]sx?$': [
      'babel-jest',
      { presets: ['@babel/preset-env', '@babel/preset-typescript'] },
    ],
  },
  testMatch: ['**/tests/**/*.test.[jt]s'],
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
};
`;

const VITEST_CONFIG_TS = `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{js,ts}'],
  },
});
`;

const VITEST_CONFIG_JS = `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
`;

export function run(ctx) {
  const jsTest = ctx.features.jsTest || "jest";
  if (jsTest === "none" || ctx.features.js === "none") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }

  if (jsTest === "vitest") {
    const isTs = ctx.features.js === "typescript";
    const configFile = isTs ? "vitest.config.ts" : "vitest.config.js";
    return {
      files: {
        [configFile]: isTs ? VITEST_CONFIG_TS : VITEST_CONFIG_JS,
      },
      dirs: [],
      deps: {},
      devDeps: {
        vitest: "^2.1.0",
      },
    };
  }

  // jsTest:jest (default)
  return {
    files: {
      "jest.config.mjs": JEST_CONFIG,
    },
    dirs: [],
    deps: {},
    devDeps: {
      jest: "^29.7.0",
      "@jest/globals": "^29.7.0",
      "babel-jest": "^29.7.0",
    },
  };
}

export const descriptor = {
  id: "jsTest",
  feature: "jsTest",
  owns: [
    "jest.config.mjs",
    "jest.config.js",
    "vitest.config.ts",
    "vitest.config.js",
  ],
  run,
};
