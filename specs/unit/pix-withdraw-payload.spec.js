import { buildPixWithdrawRequest } from "@/services/pix";

describe("Payload de saque PIX Efi", () => {
  it("monta pixSend com pagador Efi e favorecido usuario", () => {
    const request = buildPixWithdrawRequest({
      valor: 12.3,
      chavePix: "usuario@pix.com",
      chavePagador: "chave-efi",
      requestId: "saque-1776736832835-8y81gn4w0",
    });

    expect(request).toEqual({
      params: {
        idEnvio: "saque17767368328358y81gn4w0",
      },
      body: {
        valor: "12.30",
        pagador: {
          chave: "chave-efi",
        },
        favorecido: {
          chave: "usuario@pix.com",
        },
      },
    });
  });

  it("limita idEnvio ao contrato alfanumerico da Efi", () => {
    const request = buildPixWithdrawRequest({
      valor: "1.00",
      chavePix: "11999999999",
      chavePagador: "chave-efi",
      requestId: "saque-ABC-123-xyz-456-789-000-111-222-333-444",
    });

    expect(request.params.idEnvio).toMatch(/^[a-zA-Z0-9]{1,35}$/);
    expect(request.params.idEnvio).toHaveLength(35);
  });
});
