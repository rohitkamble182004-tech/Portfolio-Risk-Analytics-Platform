// jest.config.ts
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$":           "<rootDir>/$1",
    "^@components/(.*)$": "<rootDir>/components/$1",
    "^@hooks/(.*)$":      "<rootDir>/hooks/$1",
    "^@services/(.*)$":   "<rootDir>/services/$1",
    "^@types/(.*)$":      "<rootDir>/types/$1",
    "^@styles/(.*)$":     "<rootDir>/styles/$1",
    "\\.(css|scss)$":     "<rootDir>/__mocks__/styleMock.ts",
  },
  testMatch: ["<rootDir>/__tests__/**/*.(ts|tsx)"],
  collectCoverageFrom: [
    "components/**/*.{ts,tsx}",
    "hooks/**/*.{ts,tsx}",
    "services/**/*.{ts,tsx}",
    "!**/*.d.ts",
  ],
  coverageThreshold: {
    global: { branches: 60, functions: 70, lines: 70, statements: 70 },
  },
};

export default config;