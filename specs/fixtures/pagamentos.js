/**
 * specs/fixtures/pagamentos.js
 * Fábrica de dados de pagamento para testes.
 */
export const criarPagamento = (overrides = {}) => ({
  id: 1,
  user_id: 1,
  disputa_id: 1,
  valor: 100.0,
  status: "confirmado",
  metodo: "pix",
  origem: "seed_test",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const criarPagamentos = (quantidade = 3, overrides = {}) =>
  Array.from({ length: quantidade }, (_, i) =>
    criarPagamento({ id: i + 1, valor: (i + 1) * 50, ...overrides })
  );
