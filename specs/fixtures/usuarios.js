/**
 * specs/fixtures/usuarios.js
 * Fábrica de dados de usuário para testes.
 * Use `criarUsuario(overrides)` para instanciar variações.
 */
export const criarUsuario = (overrides = {}) => ({
  id: 1,
  nome: "Eduardo Oliveira",
  email: "test@firex.dev",
  cpf: "529.982.247-25", // CPF válido para testes
  data_nascimento: "1990-06-15",
  celular: "11987654321",
  canal_verificacao: "email",
  senha_hash: "$2b$10$placeholder_hash",
  aceitou_termos: 1,
  conta_verificada: 1,
  conta_liberada: 1,
  saldo: 0,
  codigo_verificacao: null,
  codigo_expira_em: null,
  reset_codigo: null,
  reset_expira_em: null,
  dois_fatores_ativo: 0,
  dois_fatores_destino: null,
  ...overrides,
});

export const usuarioPadrao = criarUsuario();

export const usuarioNaoVerificado = criarUsuario({
  conta_verificada: 0,
  conta_liberada: 0,
  codigo_verificacao: "123456",
  codigo_expira_em: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
});

export const usuarioEduardo = criarUsuario({
  email: "edunoliveira1@gmail.com",
  nome: "Eduardo",
});
