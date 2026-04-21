import { classifyPixWithdrawStatus, syncPendingPixWithdrawals } from "@/services/pix-withdraw-sync";

jest.mock("@/services/db", () => ({
  Pagamento: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
  },
  User: {
    findByPk: jest.fn(),
    update: jest.fn(),
  },
  Transacao: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  sequelize: {
    transaction: jest.fn(async (callback) =>
      callback({
        LOCK: { UPDATE: "UPDATE" },
      })
    ),
  },
}));

jest.mock("@/services/pix", () => ({
  getPixWithdrawStatus: jest.fn(),
}));

describe("Sincronizacao de saque PIX Efi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("classifica status da Efi", () => {
    expect(classifyPixWithdrawStatus("REALIZADO")).toBe("concluido");
    expect(classifyPixWithdrawStatus("EM_PROCESSAMENTO")).toBe("em_processamento");
    expect(classifyPixWithdrawStatus("REJEITADO")).toBe("falha");
  });

  it("marca saque como concluido quando a Efi confirma liquidacao", async () => {
    const { Pagamento, Transacao } = require("@/services/db");
    const { getPixWithdrawStatus } = require("@/services/pix");

    const pagamento = {
      id: 10,
      user_id: 7,
      tipo: "saque",
      metodo: "pix",
      status: "em_processamento",
      valor: "20.00",
      txid: "saque-abc",
      efi_end_to_end_id: "E2E-OK",
    };

    Pagamento.findAll.mockResolvedValue([pagamento]);
    Pagamento.findByPk.mockResolvedValue(pagamento);
    Transacao.findOne.mockResolvedValue(null);
    getPixWithdrawStatus.mockResolvedValue({ endToEndId: "E2E-OK", status: "REALIZADO" });

    const result = await syncPendingPixWithdrawals();

    expect(result.results[0]).toMatchObject({
      id: 10,
      status: "concluido",
      action: "updated",
    });
    expect(Pagamento.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "concluido" }),
      expect.objectContaining({ where: { id: 10 } })
    );
    expect(Transacao.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 7,
        tipo: "SAQUE",
        direcao: "saida",
        valor: 20,
        referencia_externa: "saque-abc",
      }),
      expect.any(Object)
    );
  });

  it("marca saque como falha e devolve saldo quando a Efi rejeita", async () => {
    const { Pagamento, Transacao, User } = require("@/services/db");
    const { getPixWithdrawStatus } = require("@/services/pix");

    const pagamento = {
      id: 11,
      user_id: 8,
      tipo: "saque",
      metodo: "pix",
      status: "em_processamento",
      valor: "15.50",
      txid: "saque-rejeitado",
      efi_end_to_end_id: "E2E-FAIL",
    };

    Pagamento.findAll.mockResolvedValue([pagamento]);
    Pagamento.findByPk.mockResolvedValue(pagamento);
    User.findByPk.mockResolvedValue({ id: 8, saldo: "4.50" });
    getPixWithdrawStatus.mockResolvedValue({ endToEndId: "E2E-FAIL", status: "REJEITADO" });

    const result = await syncPendingPixWithdrawals();

    expect(result.results[0]).toMatchObject({
      id: 11,
      status: "falha",
      action: "updated",
    });
    expect(User.update).toHaveBeenCalledWith(
      { saldo: 20 },
      expect.objectContaining({ where: { id: 8 } })
    );
    expect(Pagamento.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "falha" }),
      expect.objectContaining({ where: { id: 11 } })
    );
    expect(Transacao.create).not.toHaveBeenCalled();
  });
});
