module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: [
    "/dist"
  ],
  modulePathIgnorePatterns: ['<rootDir>/dist']
};
