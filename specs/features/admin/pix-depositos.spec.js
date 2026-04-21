import { GET as listDepositos } from "@/app/api/admin/pix/depositos/route";
import { GET as detailDeposito } from "@/app/api/admin/pix/depositos/[id]/route";
import { makeGetRequest, readJson } from "../../support/request-factory";

jest.mock("@/services/admin-auth", () => ({
  authenticateAdminRequest: jest.fn(),
}));

jest.mock("@/services/db", () => ({
  init: Promise.resolve(),
  sequelize: {
    QueryTypes: { SELECT: "SELECT" },
    query: jest.fn(),
  },
}));

describe("Admin PIX - Depositos", () => {
  beforeEach(() => jest.clearAllMocks());

  it("retorna 401 sem admin autenticado", async () => {
    const { authenticateAdminRequest } = require("@/services/admin-auth");
    authenticateAdminRequest.mockResolvedValue({ ok: false, status: 401, error: "Sessao invalida." });

    const response = await listDepositos(makeGetRequest("/api/admin/pix/depositos"));
    expect(response.status).toBe(401);
  });

  it("lista depositos com busca por comprovante/codigo", async () => {
    const { authenticateAdminRequest } = require("@/services/admin-auth");
    const { sequelize } = require("@/services/db");
    authenticateAdminRequest.mockResolvedValue({ ok: true, userId: 1 });
    sequelize.query
      .mockResolvedValueOnce([
        {
          id: 80,
          user_id: 7,
          email: "user@example.com",
          nome: "Usuario",
          valor: "25.00",
          status: "pendente",
          txid: "TX-DEP-1",
          payload_br_code: "000201PIX",
          descricao: "Deposito PIX",
        },
      ])
      .mockResolvedValueOnce([{ total: 1 }]);

    const response = await listDepositos(
      makeGetRequest("/api/admin/pix/depositos?q=000201&status=pendente&valor=25.00")
    );
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.depositos[0]).toMatchObject({
      id: 80,
      userId: 7,
      valor: "25.00",
      txid: "TX-DEP-1",
      brCode: "000201PIX",
    });
    expect(sequelize.query.mock.calls[0][1].replacements).toMatchObject({
      status: "pendente",
      q: "%000201%",
      valor: 25,
    });
  });

  it("detalha deposito por id", async () => {
    const { authenticateAdminRequest } = require("@/services/admin-auth");
    const { sequelize } = require("@/services/db");
    authenticateAdminRequest.mockResolvedValue({ ok: true, userId: 1 });
    sequelize.query.mockResolvedValueOnce([
      {
        id: 81,
        user_id: 9,
        email: "dep@example.com",
        valor: "12.00",
        status: "creditado",
        txid: "TX-OK",
        payload_br_code: "BR-CODE",
      },
    ]);

    const response = await detailDeposito(makeGetRequest("/api/admin/pix/depositos/81"), {
      params: Promise.resolve({ id: "81" }),
    });
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.deposito).toMatchObject({
      id: 81,
      userId: 9,
      txid: "TX-OK",
      brCode: "BR-CODE",
    });
  });
});
