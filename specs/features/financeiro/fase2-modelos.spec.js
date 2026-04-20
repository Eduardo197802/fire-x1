import { jest } from "@jest/globals";
import db, { User, Transacao } from "@/services/db.js";
import { registrarTransacao } from "@/services/financeiro.js";

describe("Fase 2 - Modelos e Serviço Financeiro", () => {
  beforeAll(async () => {
    await db.init;
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  test("Modelo Transacao deve existir com colunas corretas", async () => {
    const descricao = Transacao.getAttributes();
    expect(descricao).toHaveProperty("user_id");
    expect(descricao).toHaveProperty("tipo");
    expect(descricao).toHaveProperty("direcao");
    expect(descricao).toHaveProperty("valor");
    expect(descricao).toHaveProperty("status");
  });

  test("Registrar transacao deve validar tipo obrigatório", async () => {
    await expect(
      registrarTransacao({
        userId: 1,
        tipo: null,
        direcao: "entrada",
        valor: 100
      })
    ).rejects.toThrow("userId, tipo e direcao são obrigatórios");
  });

  test("Registrar transacao deve validar direcao válida", async () => {
    await expect(
      registrarTransacao({
        userId: 1,
        tipo: "DEPOSITO",
        direcao: "invalida",
        valor: 100
      })
    ).rejects.toThrow("direcao deve ser 'entrada' ou 'saida'");
  });

  test("Registrar transacao deve validar valor positivo", async () => {
    await expect(
      registrarTransacao({
        userId: 1,
        tipo: "DEPOSITO",
        direcao: "entrada",
        valor: 0
      })
    ).rejects.toThrow("valor deve ser maior que 0");
  });

  test("Registrar transacao com dados válidos deve criar record", async () => {
    const createSpy = jest.spyOn(Transacao, "create").mockResolvedValueOnce({
      id: 999,
      user_id: 1,
      tipo: "DEPOSITO",
      direcao: "entrada",
      valor: 150.50,
      status: "confirmado",
      referencia_externa: "txid-teste-001"
    });

    const transacao = await registrarTransacao({
      userId: 1,
      tipo: "DEPOSITO",
      direcao: "entrada",
      valor: 150.50,
      referenciaExterna: "txid-teste-001"
    });

    expect(transacao).toBeDefined();
    expect(transacao.user_id).toBe(1);
    expect(transacao.tipo).toBe("DEPOSITO");
    expect(transacao.direcao).toBe("entrada");
    expect(Number(transacao.valor)).toBe(150.50);
    expect(transacao.referencia_externa).toBe("txid-teste-001");

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 1,
        tipo: "DEPOSITO",
        direcao: "entrada",
        valor: 150.50,
        referencia_externa: "txid-teste-001"
      })
    );

    createSpy.mockRestore();
  });
});
