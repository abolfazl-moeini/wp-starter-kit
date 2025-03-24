export default {
  testEnvironment: 'node',
  transform: {
    "^.+\\.js$": "esbuild-jest"

  },
  testMatch: ['**/tests/**/*.test.js'],
  // Ensure Jest resolves modules like Node.js does with "type": "module"
  moduleFileExtensions: ['js', 'json'],
  injectGlobals: true

};

