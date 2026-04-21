import { POST } from "@/app/api/pix/saque/route";
import { makePostRequest, makePostRequestWithHeaders, readJson } from "../../support/request-factory";

jest.mock("@/services/db", () => ({
  init: Promise.resolve(),
  User: { findByPk: jest.fn(), update: jest.fn() },
  Pagamento: { findOne: jest.fn(), create: jest.fn(), update: jest.fn() },
  sequelize: {
    transaction: jest.fn(async (callback) =>
      callback({
        LOCK: { UPDATE: "UPDATE" },
      })
    ),
  },
}));

jest.mock("@/services/pix", () => ({
  sendPixWithdraw: jest.fn(),
}));

jest.mock("@/services/financeiro", () => ({
  registrarTransacao: jest.fn().mockResolvedValue({ id: 1 }),
}));

describe("POST /api/pix/saque", () => {
  const createToken = (userId, expiresAt = Date.now() + 60_000) => {
    const payload = `${userId}.${expiresAt}`;
    const signature = require("crypto").createHmac("sha256", "firex1-dev-secret").update(payload).digest("base64url");
    return `${payload}.${signature}`;
  };

  const post = (body, token) =>
    POST(
      makePostRequestWithHeaders("/api/pix/saque", body, {
        Authorization: `Bearer ${token}`,
      })
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna 400 quando saldo e insuficiente", async () => {
    const { Pagamento, User } = require("@/services/db");

    Pagamento.findOne.mockResolvedValue(null);
    User.findByPk.mockResolvedValue({ id: 1, saldo: 10, conta_liberada: 1, chave_pix: "user@pix.com" });

    const response = await post({ userId: 1, valor: 20, requestId: "REQ-1" }, createToken(1));
    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/saldo insuficiente/i);
  });

  it("retorna idempotente quando requestId ja existe", async () => {
    const { Pagamento } = require("@/services/db");

    Pagamento.findOne.mockResolvedValue({ status: "concluido" });

    const response = await post({ userId: 1, valor: 20, requestId: "REQ-EXISTE" }, createToken(1));
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.status).toBe("concluido");
  });

  it("processa saque com sucesso", async () => {
    const { Pagamento, User } = require("@/services/db");
    const { sendPixWithdraw } = require("@/services/pix");

    Pagamento.findOne.mockResolvedValue(null);

    User.findByPk.mockResolvedValue({
      id: 7,
      saldo: 120,
      conta_liberada: 1,
      chave_pix: "usuario@pix.com",
    });

    Pagamento.create.mockResolvedValue({ id: 99 });
    sendPixWithdraw.mockResolvedValue({ endToEndId: "E2E-SAQUE-1", status: "REALIZADO" });

    const response = await post({ userId: 7, valor: 20, requestId: "REQ-SAQUE-1" }, createToken(7));
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.status).toBe("concluido");
    expect(body.endToEndId).toBe("E2E-SAQUE-1");

    expect(User.update).toHaveBeenCalledWith(
      { saldo: 100 },
      expect.objectContaining({ where: { id: 7 } })
    );

    expect(Pagamento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: "saque",
        valor: 20,
        status: "em_processamento",
        txid: "REQ-SAQUE-1",
      }),
      expect.any(Object)
    );
  });

  it("mantem saque em processamento quando a Efi ainda nao liquidou", async () => {
    const { Pagamento, User } = require("@/services/db");
    const { sendPixWithdraw } = require("@/services/pix");
    const { registrarTransacao } = require("@/services/financeiro");

    Pagamento.findOne.mockResolvedValue(null);

    User.findByPk.mockResolvedValue({
      id: 7,
      saldo: 120,
      conta_liberada: 1,
      chave_pix: "usuario@pix.com",
    });

    Pagamento.create.mockResolvedValue({ id: 99 });
    sendPixWithdraw.mockResolvedValue({ endToEndId: "E2E-SAQUE-2", status: "EM_PROCESSAMENTO" });

    const response = await post({ userId: 7, valor: 20, requestId: "REQ-SAQUE-2" }, createToken(7));
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.status).toBe("em_processamento");
    expect(body.efiStatus).toBe("EM_PROCESSAMENTO");
    expect(Pagamento.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "em_processamento",
        efi_end_to_end_id: "E2E-SAQUE-2",
      }),
      expect.objectContaining({ where: { id: 99 } })
    );
    expect(registrarTransacao).not.toHaveBeenCalled();
  });

  it("retorna 403 quando token e de outro usuario", async () => {
    const response = await post({ userId: 7, valor: 20, requestId: "REQ-OUTRO" }, createToken(9));
    const body = await readJson(response);

    expect(response.status).toBe(403);
    expect(body.error).toMatch(/acesso negado/i);
  });

  it("retorna 401 quando token nao e informado", async () => {
    const response = await POST(makePostRequest("/api/pix/saque", { userId: 1, valor: 20, requestId: "REQ-NO-TOKEN" }));
    const body = await readJson(response);

    expect(response.status).toBe(401);
    expect(body.error).toMatch(/sessão inválida|sessao invalida|expirada/i);
  });
});
