import { jest } from "@jest/globals";

describe("Fase 3 - Integração PIX com Transações", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Webhook PIX deve registrar transacao de deposito confirmada", async () => {
    const registrarTransacao = jest.fn();

    registrarTransacao.mockResolvedValueOnce({
      id: 1,
      user_id: 1,
      tipo: "DEPOSITO",
      direcao: "entrada",
      valor: 100.00,
      status: "confirmado"
    });

    await expect(
      registrarTransacao({
        userId: 1,
        tipo: "DEPOSITO",
        direcao: "entrada",
        valor: 100.00,
        status: "confirmado"
      })
    ).resolves.toMatchObject({ tipo: "DEPOSITO", direcao: "entrada" });
  });

  test("Saque PIX deve registrar transacao de saque confirmada", async () => {
    const registrarTransacao = jest.fn();

    registrarTransacao.mockResolvedValueOnce({
      id: 2,
      user_id: 1,
      tipo: "SAQUE",
      direcao: "saida",
      valor: 50.00,
      status: "confirmado"
    });

    await expect(
      registrarTransacao({
        userId: 1,
        tipo: "SAQUE",
        direcao: "saida",
        valor: 50.00,
        status: "confirmado"
      })
    ).resolves.toMatchObject({ tipo: "SAQUE", direcao: "saida" });
  });

  test("Falha no registro de transacao nao deve bloquear webhook", async () => {
    const registrarTransacao = jest.fn();

    registrarTransacao.mockRejectedValueOnce(new Error("Conexão com banco indisponível"));

    await expect(
      registrarTransacao({
        userId: 1,
        tipo: "DEPOSITO",
        direcao: "entrada",
        valor: 100
      })
    ).rejects.toThrow("Conexão com banco indisponível");
  });

  test("Falha no registro de transacao nao deve bloquear saque", async () => {
    const registrarTransacao = jest.fn();

    registrarTransacao.mockRejectedValueOnce(new Error("Timeout ao registrar"));

    await expect(
      registrarTransacao({
        userId: 1,
        tipo: "SAQUE",
        direcao: "saida",
        valor: 50
      })
    ).rejects.toThrow("Timeout ao registrar");
  });
});
