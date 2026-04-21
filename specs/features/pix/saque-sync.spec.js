import {
  classifyPixWithdrawStatus,
  rejectPixWithdrawManually,
  syncPendingPixWithdrawals,
  syncPixWithdrawById,
} from "@/services/pix-withdraw-sync";

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
    query: jest.fn(),
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

  it("permite rejeicao manual com devolucao de saldo e log admin", async () => {
    const { Pagamento, User, sequelize } = require("@/services/db");

    Pagamento.findByPk.mockResolvedValue({
      id: 12,
      user_id: 9,
      tipo: "saque",
      metodo: "pix",
      status: "em_processamento",
      valor: "11.25",
      txid: "saque-manual",
    });
    User.findByPk.mockResolvedValue({ id: 9, saldo: "1.75" });

    const result = await rejectPixWithdrawManually({
      pagamentoId: 12,
      adminId: 3,
      motivo: "Comprovante inconsistente",
    });

    expect(result).toMatchObject({
      id: 12,
      userId: 9,
      status: "falha",
      valor: "11.25",
      saldoDevolvido: true,
    });
    expect(User.update).toHaveBeenCalledWith(
      { saldo: 13 },
      expect.objectContaining({ where: { id: 9 } })
    );
    expect(Pagamento.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "falha" }),
      expect.objectContaining({ where: { id: 12 } })
    );
    expect(sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO admin_access_logs"),
      expect.objectContaining({
        replacements: expect.objectContaining({
          adminId: 3,
          action: "pix_saque_rejeicao_manual",
        }),
      })
    );
  });

  it("sincroniza saque individual por id", async () => {
    const { Pagamento, Transacao, sequelize } = require("@/services/db");
    const { getPixWithdrawStatus } = require("@/services/pix");

    const pagamento = {
      id: 13,
      user_id: 10,
      tipo: "saque",
      metodo: "pix",
      status: "em_processamento",
      valor: "9.00",
      txid: "saque-sync-one",
      efi_end_to_end_id: "E2E-ONE",
    };

    Pagamento.findByPk.mockResolvedValue(pagamento);
    Transacao.findOne.mockResolvedValue(null);
    getPixWithdrawStatus.mockResolvedValue({ endToEndId: "E2E-ONE", status: "REALIZADO" });

    const result = await syncPixWithdrawById({ pagamentoId: 13, adminId: 4 });

    expect(result).toMatchObject({
      id: 13,
      status: "concluido",
      action: "updated",
    });
    expect(Transacao.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 10,
        tipo: "SAQUE",
        valor: 9,
        referencia_externa: "saque-sync-one",
      }),
      expect.any(Object)
    );
    expect(sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO admin_access_logs"),
      expect.objectContaining({
        replacements: expect.objectContaining({
          adminId: 4,
          action: "pix_saque_sincronizacao_manual",
        }),
      })
    );
  });
});
