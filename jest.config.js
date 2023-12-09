/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest/presets/default-esm",
  transform: {
    '^.+\\.ts?$': [
      'ts-jest', {
        useESM: true
      }
    ]
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  testEnvironment: "node",
  setupFilesAfterEnv: ["jest-extended/all"],
  testPathIgnorePatterns: ["<rootDir>/dist/", "<rootDir>/node_modules/"]
};
