/**
 * SPEC: Registro de usuário
 * Rota: POST /api/user/criar
 */
import { POST } from "@/app/api/user/[...slug]/route";
import { makePostRequest, makeContext, readJson } from "../../support/request-factory";
import { criarUsuario } from "../../fixtures";

jest.mock("@/services/db", () => ({
  init: Promise.resolve(),
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  Disputa: { findAll: jest.fn().mockResolvedValue([]) },
  Pagamento: { findAll: jest.fn().mockResolvedValue([]) },
}));

jest.mock("@/services/email", () => ({
  sendBetNotificationEmail: jest.fn(),
  sendPasswordRecoveryEmail: jest.fn(),
  sendRegistrationConfirmationEmail: jest.fn().mockResolvedValue(undefined),
  sendTwoFactorVerificationEmail: jest.fn(),
}));

const corpoValido = () => ({
  nome: "Eduardo Oliveira",
  cpf: "529.982.247-25",
  dataNascimento: "1990-06-15",
  email: "novo@firex.dev",
  celular: "11987654321",
  canalVerificacao: "email",
  senha: "Senha@123",
  aceiteTermos: true,
  maiorIdade: true,
});

const post = (body) => POST(makePostRequest("/api/user/criar", body), makeContext(["criar"]));

// ---------------------------------------------------------------------------
describe("POST /api/user/criar", () => {
  describe("validações de campos obrigatórios", () => {
    it("retorna 400 quando todos os campos estão ausentes", async () => {
      const res = await post({});
      expect(res.status).toBe(400);
    });

    it("retorna 400 quando o e-mail é inválido", async () => {
      const res = await post({ ...corpoValido(), email: "nao-e-email" });
      expect(res.status).toBe(400);
    });

    it("retorna 400 quando o e-mail é descartável", async () => {
      const res = await post({ ...corpoValido(), email: "qualquer@mailinator.com" });
      expect(res.status).toBe(400);
    });

    it("retorna 400 quando o CPF é inválido", async () => {
      const res = await post({ ...corpoValido(), cpf: "111.111.111-11" });
      expect(res.status).toBe(400);
    });

    it("retorna 400 quando o celular tem DDD inválido", async () => {
      const res = await post({ ...corpoValido(), celular: "00987654321" });
      expect(res.status).toBe(400);
    });

    it("retorna 400 quando o usuário é menor de 18 anos", async () => {
      const menorDeIdade = new Date();
      menorDeIdade.setFullYear(menorDeIdade.getFullYear() - 17);
      const data = menorDeIdade.toISOString().split("T")[0];
      const res = await post({ ...corpoValido(), dataNascimento: data });
      expect(res.status).toBe(400);
    });

    it("retorna 400 quando a senha tem menos de 8 caracteres", async () => {
      const res = await post({ ...corpoValido(), senha: "12345" });
      expect(res.status).toBe(400);
    });

    it("retorna 400 quando aceiteTermos está ausente", async () => {
      const res = await post({ ...corpoValido(), aceiteTermos: false });
      expect(res.status).toBe(400);
    });
  });

  describe("quando o e-mail ou CPF já está cadastrado", () => {
    beforeEach(() => {
      const { User } = require("@/services/db");
      User.findOne.mockResolvedValue(criarUsuario({ id: 99 }));
    });

    it("retorna 409 Conflict", async () => {
      const res = await post(corpoValido());
      expect(res.status).toBe(409);
    });
  });

  describe("fluxo de criação bem-sucedida", () => {
    beforeEach(() => {
      const { User } = require("@/services/db");
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({ id: 1, ...corpoValido() });
    });

    it("retorna 201 com requiresVerification true", async () => {
      const res = await post(corpoValido());
      const body = await readJson(res);
      expect(res.status).toBe(201);
      expect(body.requiresVerification).toBe(true);
    });

    it.todo("em desenvolvimento, expõe previewCode na resposta");
    it.todo("não expõe previewCode em produção (NODE_ENV=production)");
    it.todo("desfaz o usuário criado se o envio de e-mail falhar (retorna 502)");
  });
});
