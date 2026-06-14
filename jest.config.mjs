export default {
  setupFiles: ['<rootDir>/tests/jest.setup.js'],
  testEnvironment: 'node',
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest"
  },
  testMatch: ['**/tests/**/*.test.js'],
  moduleFileExtensions: ['js', 'json'],
  injectGlobals: false,
  transformIgnorePatterns: ['node_modules/(?!(chalk|preact|@preact))'],

};

