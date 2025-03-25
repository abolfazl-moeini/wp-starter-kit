export default {
  testEnvironment: 'node',
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest"
  },
  testMatch: ['**/tests/**/*.test.js'],
  // Ensure Jest resolves modules like Node.js does with "type": "module"
  moduleFileExtensions: ['js', 'json'],
  injectGlobals: false,
};

