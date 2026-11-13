/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: [
    '<rootDir>/src/core',
    '<rootDir>/src/domain',
    '<rootDir>/src/coach',
    '<rootDir>/src/data',
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { types: ['jest'] } }],
  },
};
