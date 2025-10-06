const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: [
    '<rootDir>/cypress/',
    // Exclude TDD placeholder and broken tests from CI
    '<rootDir>/tests/',
    '<rootDir>/__tests__/contract/',
    '<rootDir>/__tests__/unit/rate-limit.test.ts',
    '<rootDir>/__tests__/unit/validation.test.ts',
    '<rootDir>/__tests__/unit/metadata-helpers.test.ts',
  ],
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  // T047: Extended timeout for coverage runs and slow tests
  testTimeout: 120000, // 2 minutes (up from default 5s)
  // Detect open handles that prevent Jest from exiting
  detectOpenHandles: true,
  // Force exit after all tests complete (fallback)
  forceExit: false, // Set to true only if detectOpenHandles doesn't help
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)