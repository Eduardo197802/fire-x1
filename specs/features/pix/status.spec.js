import { GET } from "@/app/api/pix/status/route";
import { makeGetRequestWithHeaders, readJson } from "../../support/request-factory";

jest.mock("@/services/db", () => ({
  init: Promise.resolve(),
  Pagamento: { findOne: jest.fn() }
}));

describe("GET /api/pix/status", () => {
  const createToken = (userId, expiresAt = Date.now() + 60_000) => {
    const payload = `${userId}.${expiresAt}`;
    const signature = require("crypto").createHmac("sha256", "firex1-dev-secret").update(payload).digest("base64url");
    return `${payload}.${signature}`;
  };

  const get = ({ userId, txid, token }) =>
    GET(
      makeGetRequestWithHeaders(`/api/pix/status?userId=${userId}&txid=${encodeURIComponent(txid)}`, {
        Authorization: `Bearer ${token}`
      })
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna 400 quando txid nao e informado", async () => {
    const response = await GET(
      makeGetRequestWithHeaders(`/api/pix/status?userId=7`, {
        Authorization: `Bearer ${createToken(7)}`
      })
    );

    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/txid/i);
  });

  it("retorna 401 quando nao ha sessao", async () => {
    const response = await GET(makeGetRequestWithHeaders(`/api/pix/status?userId=7&txid=TX123`));
    const body = await readJson(response);

    expect(response.status).toBe(401);
    expect(body.error).toMatch(/sessão inválida|sessao invalida|expirada/i);
  });

  it("retorna 404 quando deposito nao existe", async () => {
    const { Pagamento } = require("@/services/db");
    Pagamento.findOne.mockResolvedValue(null);

    const response = await get({ userId: 7, txid: "TX404", token: createToken(7) });
    const body = await readJson(response);

    expect(response.status).toBe(404);
    expect(body.error).toMatch(/não encontrado|nao encontrado/i);
  });

  it("retorna status creditado quando deposito foi pago", async () => {
    const { Pagamento } = require("@/services/db");
    Pagamento.findOne.mockResolvedValue({
      txid: "TXPAID",
      status: "creditado",
      valor: "25.50",
      processado_em: "2026-04-19T12:00:00.000Z",
      webhook_recebido_em: "2026-04-19T11:59:58.000Z",
      created_at: "2026-04-19T11:58:00.000Z"
    });

    const response = await get({ userId: 7, txid: "TXPAID", token: createToken(7) });
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        txid: "TXPAID",
        status: "creditado",
        isPaid: true,
        finalized: true,
        valor: 25.5
      })
    );
  });
});
