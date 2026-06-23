/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
        useESM: true,
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch)/)',
  ],
  testTimeout: 30000,
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^node-fetch$': '<rootDir>/test/__mocks__/node-fetch.ts',
    '^boxen$': '<rootDir>/test/__mocks__/boxen.ts',
    '^string-width$': '<rootDir>/test/__mocks__/string-width.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
