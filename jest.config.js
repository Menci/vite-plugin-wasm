/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["jest-extended/all"],
  testPathIgnorePatterns: ["<rootDir>/dist/", "<rootDir>/node_modules/"]
};
