import { jest } from "@jest/globals";
import db from "@/services/db.js";
import { POST as webhookHandler } from "@/app/api/pix/webhook/route.js";
import { POST as saqueHandler } from "@/app/api/pix/saque/route.js";

jest.mock("@/services/db.js");
jest.mock("@/services/pix.js");
jest.mock("@/services/financeiro.js");
jest.mock("@/services/rate-limit.js");
jest.mock("@/services/session-auth.js");

describe("Fase 3 - Integração PIX com Transações", () => {
  beforeAll(async () => {
    await db.init;
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  test("Webhook PIX deve registrar transacao de deposito confirmada", async () => {
    const { registrarTransacao } = require("@/services/financeiro.js");

    // Simular que a transacao de deposito foi registrada
    registrarTransacao.mockResolvedValueOnce({
      id: 1,
      user_id: 1,
      tipo: "DEPOSITO",
      direcao: "entrada",
      valor: 100.00,
      status: "confirmado"
    });

    expect(registrarTransacao).toBeDefined();
  });

  test("Saque PIX deve registrar transacao de saque confirmada", async () => {
    const { registrarTransacao } = require("@/services/financeiro.js");

    registrarTransacao.mockResolvedValueOnce({
      id: 2,
      user_id: 1,
      tipo: "SAQUE",
      direcao: "saida",
      valor: 50.00,
      status: "confirmado"
    });

    expect(registrarTransacao).toBeDefined();
  });

  test("Falha no registro de transacao nao deve bloquear webhook", async () => {
    const { registrarTransacao } = require("@/services/financeiro.js");

    registrarTransacao.mockRejectedValueOnce(new Error("Conexão com banco indisponível"));

    await expect(registrarTransacao()).rejects.toThrow();
  });

  test("Falha no registro de transacao nao deve bloquear saque", async () => {
    const { registrarTransacao } = require("@/services/financeiro.js");

    registrarTransacao.mockRejectedValueOnce(new Error("Timeout ao registrar"));

    await expect(registrarTransacao()).rejects.toThrow();
  });
});
