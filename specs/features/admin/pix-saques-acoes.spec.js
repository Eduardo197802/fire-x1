import { POST as rejectSaque } from "@/app/api/admin/pix/saques/[id]/rejeitar/route";
import { POST as syncSaque } from "@/app/api/admin/pix/saques/[id]/sincronizar/route";
import { makePostRequest, readJson } from "../../support/request-factory";

jest.mock("@/services/admin-auth", () => ({
  authenticateAdminRequest: jest.fn(),
}));

jest.mock("@/services/db", () => ({
  init: Promise.resolve(),
}));

jest.mock("@/services/pix-withdraw-sync", () => ({
  rejectPixWithdrawManually: jest.fn(),
  syncPixWithdrawById: jest.fn(),
}));

describe("Admin PIX - Acoes de saque", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejeitar retorna 401 sem admin autenticado", async () => {
    const { authenticateAdminRequest } = require("@/services/admin-auth");

    authenticateAdminRequest.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Sessao administrativa invalida.",
    });

    const response = await rejectSaque(
      makePostRequest("/api/admin/pix/saques/10/rejeitar", { motivo: "Erro operacional" }),
      { params: Promise.resolve({ id: "10" }) }
    );

    expect(response.status).toBe(401);
  });

  it("rejeita saque manualmente com motivo", async () => {
    const { authenticateAdminRequest } = require("@/services/admin-auth");
    const { rejectPixWithdrawManually } = require("@/services/pix-withdraw-sync");

    authenticateAdminRequest.mockResolvedValue({ ok: true, userId: 5 });
    rejectPixWithdrawManually.mockResolvedValue({
      id: 10,
      userId: 7,
      status: "falha",
      valor: "20.00",
      saldoDevolvido: true,
    });

    const response = await rejectSaque(
      makePostRequest("/api/admin/pix/saques/10/rejeitar", { motivo: "Erro operacional" }),
      { params: Promise.resolve({ id: "10" }) }
    );
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.saque).toMatchObject({ id: 10, status: "falha", saldoDevolvido: true });
    expect(rejectPixWithdrawManually).toHaveBeenCalledWith({
      pagamentoId: 10,
      adminId: 5,
      motivo: "Erro operacional",
    });
  });

  it("sincroniza saque individual", async () => {
    const { authenticateAdminRequest } = require("@/services/admin-auth");
    const { syncPixWithdrawById } = require("@/services/pix-withdraw-sync");

    authenticateAdminRequest.mockResolvedValue({ ok: true, userId: 6 });
    syncPixWithdrawById.mockResolvedValue({
      id: 11,
      status: "concluido",
      efiStatus: "REALIZADO",
      action: "updated",
    });

    const response = await syncSaque(
      makePostRequest("/api/admin/pix/saques/11/sincronizar", {}),
      { params: Promise.resolve({ id: "11" }) }
    );
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.saque).toMatchObject({ id: 11, status: "concluido" });
    expect(syncPixWithdrawById).toHaveBeenCalledWith({
      pagamentoId: 11,
      adminId: 6,
    });
  });

  it("retorna 400 quando servico rejeita a acao", async () => {
    const { authenticateAdminRequest } = require("@/services/admin-auth");
    const { rejectPixWithdrawManually } = require("@/services/pix-withdraw-sync");

    authenticateAdminRequest.mockResolvedValue({ ok: true, userId: 5 });
    rejectPixWithdrawManually.mockRejectedValue(new Error("Informe uma justificativa para rejeitar o saque."));

    const response = await rejectSaque(
      makePostRequest("/api/admin/pix/saques/10/rejeitar", { motivo: "" }),
      { params: Promise.resolve({ id: "10" }) }
    );
    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/justificativa/i);
  });
});
