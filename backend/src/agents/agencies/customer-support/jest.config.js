/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: [
    '<rootDir>/**/*.test.ts',
    '<rootDir>/**/*.spec.ts'
  ],
  collectCoverageFrom: [
    '<rootDir>/**/*.ts',
    '!<rootDir>/**/*.d.ts',
    '!<rootDir>/**/*.test.ts',
    '!<rootDir>/**/*.spec.ts',
    '!<rootDir>/dist/**',
    '!<rootDir>/node_modules/**'
  ],
  coverageDirectory: '<rootDir>/coverage',
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],
  moduleNameMapping: {
    '^@core/(.*)$': '<rootDir>/../../../core/$1',
    '^@shared/(.*)$': '<rootDir>/__mocks__/shared/$1',
    '^@customer-support/(.*)$': '<rootDir>/$1'
  },
  transform: {
    '^.+\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
      isolatedModules: true
    }]
  },
  verbose: true,
  testTimeout: 10000
};