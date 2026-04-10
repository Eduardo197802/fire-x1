/**
 * SPEC: Verificação de conta e reenvio de código
 * Rotas:
 *   POST /api/user/verificar
 *   POST /api/user/reenviar-codigo
 */
import { POST } from "@/app/api/user/[...slug]/route";
import { makePostRequest, makeContext, readJson } from "../../support/request-factory";
import { criarUsuario, usuarioNaoVerificado } from "../../fixtures";

jest.mock("@/services/db", () => ({
  init: Promise.resolve(),
  User: { findOne: jest.fn(), findByPk: jest.fn(), create: jest.fn(), update: jest.fn() },
  Disputa: { findAll: jest.fn().mockResolvedValue([]) },
  Pagamento: { findAll: jest.fn().mockResolvedValue([]) },
}));

jest.mock("@/services/email", () => ({
  sendBetNotificationEmail: jest.fn(),
  sendPasswordRecoveryEmail: jest.fn(),
  sendRegistrationConfirmationEmail: jest.fn().mockResolvedValue(undefined),
  sendTwoFactorVerificationEmail: jest.fn(),
}));

const postVerificar = (body) =>
  POST(makePostRequest("/api/user/verificar", body), makeContext(["verificar"]));

const postReenviar = (body) =>
  POST(makePostRequest("/api/user/reenviar-codigo", body), makeContext(["reenviar-codigo"]));

// ---------------------------------------------------------------------------
describe("POST /api/user/verificar", () => {
  it("retorna 400 quando userId ou código estão ausentes", async () => {
    const res = await postVerificar({});
    expect(res.status).toBe(400);
  });

  describe("quando a conta não é encontrada", () => {
    beforeEach(() => {
      const { User } = require("@/services/db");
      User.findByPk.mockResolvedValue(null);
    });

    it("retorna 404", async () => {
      const res = await postVerificar({ userId: 999, codigo: "123456" });
      expect(res.status).toBe(404);
    });
  });

  describe("quando o código expirou", () => {
    beforeEach(() => {
      const { User } = require("@/services/db");
      User.findByPk.mockResolvedValue(
        criarUsuario({
          conta_verificada: 0,
          codigo_verificacao: "123456",
          codigo_expira_em: new Date(Date.now() - 1000).toISOString(), // expirado
        })
      );
    });

    it("retorna 400 com mensagem de código expirado", async () => {
      const res = await postVerificar({ userId: 1, codigo: "123456" });
      const body = await readJson(res);
      expect(res.status).toBe(400);
      expect(body.error).toMatch(/expirou/i);
    });
  });

  describe("quando o código é válido", () => {
    beforeEach(() => {
      const { User } = require("@/services/db");
      User.findByPk.mockResolvedValue(usuarioNaoVerificado);
      User.update.mockResolvedValue([1]);
    });

    it("retorna 200 com contaLiberada true", async () => {
      const res = await postVerificar({ userId: 1, codigo: "123456" });
      const body = await readJson(res);
      expect(res.status).toBe(200);
      expect(body.contaLiberada).toBe(true);
    });
  });

  it.todo("retorna 200 imediatamente se a conta já estava verificada");
});

// ---------------------------------------------------------------------------
describe("POST /api/user/reenviar-codigo", () => {
  it("retorna 400 quando userId está ausente", async () => {
    const res = await postReenviar({});
    expect(res.status).toBe(400);
  });

  it.todo("retorna 400 quando a conta já está verificada");
  it.todo("retorna 200 com maskedDestination e previewCode em desenvolvimento");
  it.todo("retorna 502 quando o envio de e-mail falha");
});
