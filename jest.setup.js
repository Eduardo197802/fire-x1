/**
 * jest.setup.js
 * Executado após o framework Jest ser carregado, antes de cada suite.
 * Use aqui: jest.setTimeout, matchers globais, etc.
 */

// Timeout mais alto para specs de integração que inicializam o DB
jest.setTimeout(15_000);
