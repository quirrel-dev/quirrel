module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["/dist", "/development-ui"],
  modulePathIgnorePatterns: ["<rootDir>/dist", "<rootDir>/development-ui"],
};
