module.exports = {
  preset: "jest-playwright-preset",
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  testEnvironmentOptions: {
    "jest-playwright": {
      collectCoverage: true,
    },
  },
  watchPathIgnorePatterns: ["node_modules", ".nyc_output", "dist", ".parcel-cache"],
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.test.json",
    },
  },
};
