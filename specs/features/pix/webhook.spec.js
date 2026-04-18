import { POST } from "@/app/api/pix/webhook/route";
import { makePostRequest, makePostRequestWithHeaders, readJson } from "../../support/request-factory";

jest.mock("@/services/db", () => ({
  init: Promise.resolve(),
  User: { findByPk: jest.fn(), update: jest.fn() },
  Pagamento: { findOne: jest.fn(), update: jest.fn() },
  sequelize: {
    transaction: jest.fn(async (callback) =>
      callback({
        LOCK: { UPDATE: "UPDATE" },
      })
    ),
  },
}));

describe("POST /api/pix/webhook", () => {
  const post = (body, token = "webhook-secret-test") =>
    POST(
      makePostRequestWithHeaders("/api/pix/webhook", body, {
        "x-efi-webhook-token": token,
      })
    );

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EFI_PIX_WEBHOOK_TOKEN = "webhook-secret-test";
  });

  it("retorna processed 0 quando payload nao tem eventos pix", async () => {
    const response = await post({});
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({ processed: 0, ignored: 0 });
  });

  it("ignora evento quando transacao ja foi creditada", async () => {
    const { Pagamento } = require("@/services/db");

    Pagamento.findOne
      .mockResolvedValueOnce({ id: 1, user_id: 10, valor: 20, status: "pendente" })
      .mockResolvedValueOnce({ id: 1, user_id: 10, valor: 20, status: "creditado" });

    const response = await post({ pix: [{ txid: "TX123", valor: "20.00" }] });
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({ processed: 0, ignored: 1 });
  });

  it("credita saldo e marca pagamento como creditado quando webhook e valido", async () => {
    const { Pagamento, User } = require("@/services/db");

    Pagamento.findOne
      .mockResolvedValueOnce({ id: 2, user_id: 7, valor: 25.5, status: "pendente" })
      .mockResolvedValueOnce({ id: 2, user_id: 7, valor: 25.5, status: "pendente" });

    User.findByPk.mockResolvedValue({ id: 7, saldo: 100 });

    const response = await post({
      pix: [{ txid: "TX999", valor: "25.50", endToEndId: "E2E-1" }],
    });

    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({ processed: 1, ignored: 0 });

    expect(User.update).toHaveBeenCalledWith(
      { saldo: 125.5 },
      expect.objectContaining({ where: { id: 7 } })
    );

    expect(Pagamento.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "creditado",
        valor: 25.5,
        efi_end_to_end_id: "E2E-1",
      }),
      expect.objectContaining({ where: { id: 2 } })
    );
  });

  it("retorna 401 quando token do webhook e invalido", async () => {
    const response = await post({ pix: [{ txid: "TX1" }] }, "token-invalido");
    const body = await readJson(response);

    expect(response.status).toBe(401);
    expect(body.error).toMatch(/webhook pix não autorizado|webhook pix nao autorizado/i);
  });
});
