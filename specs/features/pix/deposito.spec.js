import { POST } from "@/app/api/pix/gerar/route";
import { makePostRequest, makePostRequestWithHeaders, readJson } from "../../support/request-factory";

jest.mock("@/services/db", () => ({
  init: Promise.resolve(),
  User: { findByPk: jest.fn() },
  Pagamento: { create: jest.fn() },
}));

jest.mock("@/services/pix", () => ({
  createPixDepositCharge: jest.fn(),
}));

describe("POST /api/pix/gerar", () => {
  const createToken = (userId, expiresAt = Date.now() + 60_000) => {
    const payload = `${userId}.${expiresAt}`;
    const signature = require("crypto").createHmac("sha256", "firex1-dev-secret").update(payload).digest("base64url");
    return `${payload}.${signature}`;
  };

  const post = (body, token) =>
    POST(
      makePostRequestWithHeaders("/api/pix/gerar", body, {
        Authorization: `Bearer ${token}`,
      })
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna 400 quando valor e invalido", async () => {
    const response = await post({ userId: 1, valor: 0 }, createToken(1));
    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/valor inválido|valor invalido/i);
  });

  it("retorna 403 quando conta nao esta liberada", async () => {
    const { User } = require("@/services/db");
    User.findByPk.mockResolvedValue({ conta_liberada: 0 });

    const response = await post({ userId: 1, valor: 10 }, createToken(1));

    expect(response.status).toBe(403);
  });

  it("gera cobranca pix e registra pagamento pendente", async () => {
    const { User, Pagamento } = require("@/services/db");
    const { createPixDepositCharge } = require("@/services/pix");

    User.findByPk.mockResolvedValue({ conta_liberada: 1 });
    createPixDepositCharge.mockResolvedValue({
      txid: "TX123",
      brCode: "BRCODE123",
      qrCodeImage: "https://imagem.qr/pix.png",
    });

    const response = await post({ userId: 7, valor: 25.5 }, createToken(7));
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.txid).toBe("TX123");
    expect(Pagamento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 7,
        tipo: "deposito",
        valor: 25.5,
        status: "pendente",
        metodo: "pix",
        txid: "TX123",
      })
    );
  });

  it("retorna 401 quando token nao e informado", async () => {
    const response = await POST(makePostRequest("/api/pix/gerar", { userId: 1, valor: 10 }));
    const body = await readJson(response);

    expect(response.status).toBe(401);
    expect(body.error).toMatch(/sessão inválida|sessao invalida|expirada/i);
  });
});
