export default {
  setupFiles: ['<rootDir>/tests/jest.setup.js'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['@babel/preset-env', '@babel/preset-typescript'] }],
  },
  testMatch: ['**/tests/**/*.test.[jt]s'],
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],

  transformIgnorePatterns: ['node_modules/(?!(chalk|preact|@preact))'],

};

