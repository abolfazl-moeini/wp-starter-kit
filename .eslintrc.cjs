/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  ignorePatterns: [
    'node_modules/',
    'vendor/',
    'dist/',
    'build/',
    'assets/bundles/',
    'assets/libraries/',
    'assets/map/',
    'examples/',
    'packages/wpdev-framework/',
    '*.min.js',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
  },
  overrides: [
    {
      files: [
        'assets/**/*',
        'packages/**/*',
        'src/Modules/**/*',
        'core/packages/**/*',
      ],
      env: {
        browser: true,
        node: true,
      },
      rules: {
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-this-alias': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        'no-cond-assign': 'off',
        'no-empty': 'off',
        'no-undef': 'off',
        'no-useless-escape': 'off',
      },
    },
    {
      files: ['**/*.js'],
      parserOptions: {
        sourceType: 'module',
      },
    },
    {
      files: ['tests/**/*'],
      env: {
        node: true,
        jest: true,
        browser: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        'no-undef': 'off',
      },
    },
  ],
};