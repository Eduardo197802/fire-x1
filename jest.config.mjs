import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

/**
 * Spec Driven Development — configuração Jest
 *
 * Todos os specs vivem em  specs/
 *   specs/unit/       → funções puras, models
 *   specs/features/   → flows de negócio (integração com mocks)
 *   specs/fixtures/   → fábricas de dados de teste
 *   specs/support/    → utilitários de teste compartilhados
 */
export default createJestConfig({
  testEnvironment: "node",
  testMatch: ["<rootDir>/specs/**/*.spec.js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  clearMocks: true,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: [
    "src/utils/**/*.js",
    "src/services/**/*.js",
    "src/models/**/*.js",
    "src/app/api/**/*.js",
    "!src/**/__mocks__/**",
  ],
  coverageDirectory: "<rootDir>/coverage",
  coverageReporters: ["text", "text-summary"],
});
