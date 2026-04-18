/**
 * SPEC: Dashboard do usuário
 * Rota: GET /api/user/dashboard/:userId
 */
import { GET } from "@/app/api/user/[...slug]/route";
import { makeGetRequest, makeGetRequestWithHeaders, makeContext, readJson } from "../../support/request-factory";
import { criarUsuario, criarDisputas } from "../../fixtures";

jest.mock("@/services/db", () => ({
  init: Promise.resolve(),
  User: { findOne: jest.fn(), findByPk: jest.fn() },
  Disputa: { findAll: jest.fn() },
  Pagamento: { findAll: jest.fn().mockResolvedValue([]) },
}));

jest.mock("@/services/email", () => ({
  sendBetNotificationEmail: jest.fn(),
  sendPasswordRecoveryEmail: jest.fn(),
  sendRegistrationConfirmationEmail: jest.fn(),
  sendTwoFactorVerificationEmail: jest.fn(),
}));

const createToken = (userId, expiresAt = Date.now() + 60_000) => {
  const payload = `${userId}.${expiresAt}`;
  const signature = require("crypto").createHmac("sha256", "firex1-dev-secret").update(payload).digest("base64url");
  return `${payload}.${signature}`;
};

const get = (userId, token) =>
  GET(
    makeGetRequestWithHeaders(`/api/user/dashboard/${userId}`, {
      Authorization: `Bearer ${token}`
    }),
    makeContext(["dashboard", String(userId)])
  );

// ---------------------------------------------------------------------------
describe("GET /api/user/dashboard/:userId", () => {
  describe("quando o usuário existe e tem disputas", () => {
    let token;

    beforeEach(() => {
      const { User, Disputa } = require("@/services/db");
      User.findByPk.mockResolvedValue(criarUsuario({ id: 1, saldo: 500 }));
      Disputa.findAll.mockResolvedValue(criarDisputas(3, { user_id: 1, valor: 100 }));
      token = createToken(1);
    });

    it("retorna 200", async () => {
      const res = await get(1, token);
      expect(res.status).toBe(200);
    });

    it("inclui campos extrato no corpo da resposta", async () => {
      const res = await get(1, token);
      const body = await readJson(res);
      // Estrutura real: { metrics, user, activity }
      expect(body).toHaveProperty("metrics");
      expect(body).toHaveProperty("metrics.saldoDisponivel");
      expect(body).toHaveProperty("metrics.extrato");
      expect(body).toHaveProperty("user.saldo");
    });

    it.todo("calcula totalDepositos corretamente a partir das disputas com valor positivo");
    it.todo("calcula totalSaques corretamente a partir das disputas com valor negativo");
    it.todo("retorna extrato com pelo menos tantos itens quanto disputas existentes");
  });

  describe("quando o userId é inválido", () => {
    beforeEach(() => {
      const { User } = require("@/services/db");
      User.findByPk.mockResolvedValue(null);
    });

    it.todo("retorna 404 quando o usuário não é encontrado");
  });

  describe("quando não há autenticação", () => {
    it("retorna 401", async () => {
      const res = await GET(
        makeGetRequest(`/api/user/dashboard/1`),
        makeContext(["dashboard", "1"])
      );

      expect(res.status).toBe(401);
    });
  });

  describe("quando o token é de outro usuário", () => {
    it("retorna 403", async () => {
      const res = await get(1, createToken(2));
      expect(res.status).toBe(403);
    });
  });
});
