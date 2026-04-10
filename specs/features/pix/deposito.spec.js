import { POST } from "@/app/api/pix/gerar/route";
import { makePostRequest, readJson } from "../../support/request-factory";

jest.mock("@/services/db", () => ({
  init: Promise.resolve(),
  User: { findByPk: jest.fn() },
  Pagamento: { create: jest.fn() },
}));

jest.mock("@/services/pix", () => ({
  createPixDepositCharge: jest.fn(),
}));

describe("POST /api/pix/gerar", () => {
  const post = (body) => POST(makePostRequest("/api/pix/gerar", body));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna 400 quando valor e invalido", async () => {
    const response = await post({ userId: 1, valor: 0 });
    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/valor inválido|valor invalido/i);
  });

  it("retorna 403 quando conta nao esta liberada", async () => {
    const { User } = require("@/services/db");
    User.findByPk.mockResolvedValue({ conta_liberada: 0 });

    const response = await post({ userId: 1, valor: 10 });

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

    const response = await post({ userId: 7, valor: 25.5 });
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
});
