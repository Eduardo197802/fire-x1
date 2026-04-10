/**
 * SPEC: Login de usuário
 * Rota: POST /api/user/login
 *
 * Convenção SDD:
 *  - Comece pelo spec. Quando um comportamento não estiver implementado, use it.todo.
 *  - Ao implementar, substitua it.todo por it e escreva a asserção.
 */
import { POST } from "@/app/api/user/[...slug]/route";
import { makePostRequest, makeContext, readJson } from "../../support/request-factory";
import { criarUsuario } from "../../fixtures";

// --- Mocks de dependências externas ---
jest.mock("@/services/db", () => ({
  init: Promise.resolve(),
  User: { findOne: jest.fn(), findByPk: jest.fn(), create: jest.fn(), update: jest.fn() },
  Disputa: { findAll: jest.fn().mockResolvedValue([]) },
  Pagamento: { findAll: jest.fn().mockResolvedValue([]) },
}));

jest.mock("@/services/email", () => ({
  sendBetNotificationEmail: jest.fn(),
  sendPasswordRecoveryEmail: jest.fn(),
  sendRegistrationConfirmationEmail: jest.fn(),
  sendTwoFactorVerificationEmail: jest.fn(),
}));

// Atalho para chamar a rota corretamente
const post = (body) => POST(makePostRequest("/api/user/login", body), makeContext(["login"]));

// ---------------------------------------------------------------------------
describe("POST /api/user/login", () => {
  describe("quando os campos estão ausentes", () => {
    it("retorna 400 quando e-mail e senha são omitidos", async () => {
      const res = await post({});
      expect(res.status).toBe(400);
    });

    it("retorna 400 quando apenas a senha é omitida", async () => {
      const res = await post({ email: "usuario@test.dev" });
      expect(res.status).toBe(400);
    });
  });

  describe("quando o usuário não existe", () => {
    beforeEach(() => {
      const { User } = require("@/services/db");
      User.findOne.mockResolvedValue(null);
    });

    it("retorna 401 com mensagem genérica (não revela se e-mail existe)", async () => {
      const res = await post({ email: "fantasma@test.dev", senha: "qualquer" });
      const body = await readJson(res);
      expect(res.status).toBe(401);
      expect(body.error).toMatch(/e-mail ou senha incorretos/i);
    });
  });

  describe("quando a conta não está verificada", () => {
    beforeEach(() => {
      const { User } = require("@/services/db");
      User.findOne.mockResolvedValue(criarUsuario({ conta_verificada: 0 }));
    });

    it("retorna 403 orientando o usuário a verificar o e-mail", async () => {
      const res = await post({ email: "usuario@test.dev", senha: "qualquer" });
      expect(res.status).toBe(403);
    });
  });

  describe("quando a senha está incorreta", () => {
    beforeEach(() => {
      const { User } = require("@/services/db");
      // Hash de senha diferente da enviada
      User.findOne.mockResolvedValue(
        criarUsuario({ senha_hash: "$2b$10$invalido.hash.para.forcar.falha.X" })
      );
    });

    it("retorna 401 com mensagem genérica", async () => {
      const res = await post({ email: "usuario@test.dev", senha: "senha_errada" });
      expect(res.status).toBe(401);
    });
  });

  describe("fluxo de login bem-sucedido", () => {
    it.todo("retorna 200 com id, nome, email e saldo quando as credenciais são válidas");
    it.todo("aciona envio de código 2FA quando dois_fatores_ativo = 1");
  });
});
