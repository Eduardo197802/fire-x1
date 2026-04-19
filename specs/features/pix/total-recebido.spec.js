import { GET } from "@/app/api/pix/total-recebido/route";
import { makeGetRequestWithHeaders, readJson } from "../../support/request-factory";

jest.mock("@/services/db", () => ({
  init: Promise.resolve(),
  User: { findByPk: jest.fn() },
  sequelize: { query: jest.fn() }
}));

jest.mock("@/services/rate-limit", () => ({
  consumeRateLimit: jest.fn().mockReturnValue({ allowed: true, retryAfterSeconds: 0 }),
  getRequestClientIp: jest.fn().mockReturnValue("127.0.0.1")
}));

jest.mock("@/services/session-auth", () => ({
  extractSessionToken: jest.fn(),
  decodeAuthToken: jest.fn()
}));

describe("GET /api/pix/total-recebido", () => {
  const envBackup = {
    PIX_TOTAL_API_TOKEN: process.env.PIX_TOTAL_API_TOKEN,
    PIX_TOTAL_ALLOWED_USER_IDS: process.env.PIX_TOTAL_ALLOWED_USER_IDS
  };

  const get = (headers = {}) =>
    GET(
      makeGetRequestWithHeaders("/api/pix/total-recebido", headers)
    );

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PIX_TOTAL_API_TOKEN = "segredo-total";
    process.env.PIX_TOTAL_ALLOWED_USER_IDS = "7,9";
  });

  afterAll(() => {
    process.env.PIX_TOTAL_API_TOKEN = envBackup.PIX_TOTAL_API_TOKEN;
    process.env.PIX_TOTAL_ALLOWED_USER_IDS = envBackup.PIX_TOTAL_ALLOWED_USER_IDS;
  });

  it("retorna 503 quando token operacional nao esta configurado", async () => {
    const { extractSessionToken, decodeAuthToken } = require("@/services/session-auth");
    process.env.PIX_TOTAL_API_TOKEN = "";
    extractSessionToken.mockReturnValue("sessao");
    decodeAuthToken.mockReturnValue({ userId: 7 });

    const response = await get({ "x-pix-total-token": "segredo-total" });

    expect(response.status).toBe(503);
  });

  it("retorna 401 quando sessao e invalida", async () => {
    const { decodeAuthToken, extractSessionToken } = require("@/services/session-auth");
    extractSessionToken.mockReturnValue("sessao-invalida");
    decodeAuthToken.mockReturnValue(null);

    const response = await get({ "x-pix-total-token": "segredo-total" });

    expect(response.status).toBe(401);
  });

  it("retorna 403 quando usuario nao esta autorizado", async () => {
    const { decodeAuthToken, extractSessionToken } = require("@/services/session-auth");
    extractSessionToken.mockReturnValue("sessao");
    decodeAuthToken.mockReturnValue({ userId: 1 });

    const response = await get({ "x-pix-total-token": "segredo-total" });

    expect(response.status).toBe(403);
  });

  it("retorna 401 quando token operacional e invalido", async () => {
    const { decodeAuthToken, extractSessionToken } = require("@/services/session-auth");
    extractSessionToken.mockReturnValue("sessao");
    decodeAuthToken.mockReturnValue({ userId: 7 });

    const response = await get({ "x-pix-total-token": "token-errado" });

    expect(response.status).toBe(401);
  });

  it("retorna 429 quando rate limit e excedido", async () => {
    const { decodeAuthToken, extractSessionToken } = require("@/services/session-auth");
    const { consumeRateLimit } = require("@/services/rate-limit");

    extractSessionToken.mockReturnValue("sessao");
    decodeAuthToken.mockReturnValue({ userId: 7 });
    consumeRateLimit.mockReturnValueOnce({ allowed: false, retryAfterSeconds: 30 });

    const response = await get({ "x-pix-total-token": "segredo-total" });

    expect(response.status).toBe(429);
  });

  it("retorna 200 com total pix recebido para operador autorizado", async () => {
    const { decodeAuthToken, extractSessionToken } = require("@/services/session-auth");
    const { User, sequelize } = require("@/services/db");

    extractSessionToken.mockReturnValue("sessao");
    decodeAuthToken.mockReturnValue({ userId: 7 });
    User.findByPk.mockResolvedValue({ id: 7, conta_liberada: 1, two_factor_enabled: 1 });
    sequelize.query.mockResolvedValue([{ total_pix_recebido: "1425.90" }]);

    const response = await get({ "x-pix-total-token": "segredo-total" });
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({
      totalPixRecebido: 1425.9,
      moeda: "BRL"
    });
    expect(sequelize.query).toHaveBeenCalled();
  });
});
