export default {
  setupFiles: ['<rootDir>/tests/jest.setup.js'],
  testEnvironment: 'node',
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest"
  },
  testMatch: ['**/tests/**/*.test.js'],
  // Ensure Jest resolves modules like Node.js does with "type": "module"
  moduleFileExtensions: ['js', 'json'],
  injectGlobals: false,
  transformIgnorePatterns: ['node_modules/(?!chalk)'],

};

