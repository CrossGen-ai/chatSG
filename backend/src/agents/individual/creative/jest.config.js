/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: [
    '<rootDir>/**/*.test.ts',
    '<rootDir>/**/*.spec.ts'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/../../../agencies/',
    '<rootDir>/../../../orchestrator/',
    '<rootDir>/../../../wrappers/',
    '<rootDir>/../../../state/',
    '<rootDir>/../../../config/',
    '<rootDir>/../../../tools/examples/',
    '<rootDir>/../../../types/',
    '<rootDir>/../../*/',
    '!<rootDir>/../../shared/'
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
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],
  moduleNameMapping: {
    '^@core/(.*)$': '<rootDir>/../../../core/$1',
    '^@shared/(.*)$': '<rootDir>/../../../shared/$1',
    '^@analytical/(.*)$': '<rootDir>/$1'
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
      isolatedModules: true
    }]
  },
  moduleFileExtensions: [
    'ts',
    'js',
    'json'
  ],
  verbose: true,
  testTimeout: 10000,
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },
  // Mock external dependencies that aren't available in isolation
  moduleNameMapping: {
    '^@core/(.*)$': '<rootDir>/../../../core/$1',
    '^@shared/(.*)$': '<rootDir>/__mocks__/shared/$1',
    '^@analytical/(.*)$': '<rootDir>/$1'
  }
}; 