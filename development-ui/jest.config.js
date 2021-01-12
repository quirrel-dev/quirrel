module.exports = {
  preset: 'jest-playwright-preset',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testEnvironmentOptions: {
    "jest-playwright": {
      collectCoverage: true,
    },
  },

  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.test.json"
    }
  }
};