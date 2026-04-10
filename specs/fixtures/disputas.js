/**
 * specs/fixtures/disputas.js
 * Fábrica de dados de disputa para testes.
 */
export const criarDisputa = (overrides = {}) => ({
  id: 1,
  user_id: 1,
  titulo: "Disputa de Teste",
  descricao: "Disputa criada automaticamente para testes unitários.",
  valor: 250.0,
  status: "aberta",
  origem: "seed_test",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const criarDisputas = (quantidade = 3, overrides = {}) =>
  Array.from({ length: quantidade }, (_, i) =>
    criarDisputa({ id: i + 1, titulo: `Disputa ${i + 1}`, ...overrides })
  );
