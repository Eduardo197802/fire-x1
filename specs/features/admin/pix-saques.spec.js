import { GET as listSaques } from "@/app/api/admin/pix/saques/route";
import { GET as detailSaque } from "@/app/api/admin/pix/saques/[id]/route";
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

describe("Admin PIX - Saques", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna 401 quando admin nao esta autenticado", async () => {
    const { authenticateAdminRequest } = require("@/services/admin-auth");

    authenticateAdminRequest.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Sessao administrativa invalida.",
    });

    const response = await listSaques(makeGetRequest("/api/admin/pix/saques"));
    const body = await readJson(response);

    expect(response.status).toBe(401);
    expect(body.error).toContain("Sessao");
  });

  it("lista saques pix com filtros operacionais", async () => {
    const { authenticateAdminRequest } = require("@/services/admin-auth");
    const { sequelize } = require("@/services/db");

    authenticateAdminRequest.mockResolvedValue({ ok: true, userId: 1 });
    sequelize.query
      .mockResolvedValueOnce([
        {
          id: 50,
          user_id: 7,
          email: "user@example.com",
          nome: "Usuario",
          valor: "0.03",
          status: "em_processamento",
          txid: "saque-abc",
          efi_end_to_end_id: "E2E-123",
          chave_pix_destino: "07670097701",
          descricao: "Saque PIX enviado para Efi: EM_PROCESSAMENTO",
          created_at: "2026-04-21 16:17:16",
        },
      ])
      .mockResolvedValueOnce([{ total: 1 }]);

    const response = await listSaques(
      makeGetRequest("/api/admin/pix/saques?status=em_processamento&q=E2E&limite=10")
    );
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.limite).toBe(10);
    expect(body.saques[0]).toMatchObject({
      id: 50,
      userId: 7,
      status: "em_processamento",
      requestId: "saque-abc",
      endToEndId: "E2E-123",
    });
    expect(sequelize.query.mock.calls[0][1].replacements).toMatchObject({
      status: "em_processamento",
      q: "%E2E%",
      limite: 10,
      offset: 0,
    });
  });

  it("detalha saque pix por id", async () => {
    const { authenticateAdminRequest } = require("@/services/admin-auth");
    const { sequelize } = require("@/services/db");

    authenticateAdminRequest.mockResolvedValue({ ok: true, userId: 1 });
    sequelize.query.mockResolvedValueOnce([
      {
        id: 51,
        user_id: 8,
        email: "pix@example.com",
        nome: "Pix User",
        cpf: "00000000000",
        celular: "21999999999",
        valor: "15.50",
        status: "concluido",
        txid: "saque-def",
        efi_end_to_end_id: "E2E-OK",
        chave_pix_destino: "pix@example.com",
        gateway: "efi",
        origem: "efi",
      },
    ]);

    const response = await detailSaque(makeGetRequest("/api/admin/pix/saques/51"), {
      params: Promise.resolve({ id: "51" }),
    });
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.saque).toMatchObject({
      id: 51,
      userId: 8,
      valor: "15.50",
      status: "concluido",
      endToEndId: "E2E-OK",
    });
  });

  it("retorna 400 para id invalido no detalhe", async () => {
    const { authenticateAdminRequest } = require("@/services/admin-auth");

    authenticateAdminRequest.mockResolvedValue({ ok: true, userId: 1 });

    const response = await detailSaque(makeGetRequest("/api/admin/pix/saques/abc"), {
      params: Promise.resolve({ id: "abc" }),
    });
    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/inválido|invalido/i);
  });
});
