/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/core'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { types: ['jest'] } }],
  },
};
