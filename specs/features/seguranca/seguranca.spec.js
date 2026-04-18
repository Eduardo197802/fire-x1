/**
 * SPEC: Segurança — alteração de senha e 2FA
 * Rotas:
 *   POST /api/user/alterar-senha
 *   POST /api/user/2fa/cadastrar
 *   POST /api/user/2fa/ativar
 *   POST /api/user/2fa/desativar
 */
import { POST } from "@/app/api/user/[...slug]/route";
import { makePostRequest, makePostRequestWithHeaders, makeContext, readJson } from "../../support/request-factory";
import { criarUsuario } from "../../fixtures";

jest.mock("@/services/db", () => ({
  init: Promise.resolve(),
  User: { findOne: jest.fn(), findByPk: jest.fn(), create: jest.fn(), update: jest.fn() },
  Disputa: { findAll: jest.fn().mockResolvedValue([]) },
  Pagamento: { findAll: jest.fn().mockResolvedValue([]) },
}));

jest.mock("@/services/email", () => ({
  sendBetNotificationEmail: jest.fn(),
  sendPasswordRecoveryEmail: jest.fn(),
  sendRegistrationConfirmationEmail: jest.fn(),
  sendTwoFactorVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));

const createToken = (userId, expiresAt = Date.now() + 60_000) => {
  const payload = `${userId}.${expiresAt}`;
  const signature = require("crypto").createHmac("sha256", "firex1-dev-secret").update(payload).digest("base64url");
  return `${payload}.${signature}`;
};

const post = (slug, body, token) =>
  POST(
    token
      ? makePostRequestWithHeaders(`/api/user/${slug}`, body, { Authorization: `Bearer ${token}` })
      : makePostRequest(`/api/user/${slug}`, body),
    makeContext(slug.split("/"))
  );

// ---------------------------------------------------------------------------
describe("POST /api/user/alterar-senha", () => {
  it("retorna 400 quando userId está ausente", async () => {
    const res = await post("alterar-senha", { senhaAtual: "old", novaSenha: "new12345" });
    expect(res.status).toBe(400);
  });

  it("retorna 400 quando nova senha tem menos de 8 caracteres", async () => {
    const res = await post("alterar-senha", { userId: 1, senhaAtual: "old", novaSenha: "123" });
    expect(res.status).toBe(400);
  });

  describe("quando a senha atual está incorreta", () => {
    beforeEach(() => {
      const { User } = require("@/services/db");
      User.findByPk.mockResolvedValue(
        criarUsuario({ senha_hash: "$2b$10$invalido.hash.para.forcar.falha.X" })
      );
    });

    it("retorna 401", async () => {
      const res = await post("alterar-senha", {
        userId: 1,
        senhaAtual: "senha_errada",
        novaSenha: "NovaSenh@123",
      }, createToken(1));
      expect(res.status).toBe(401);
    });
  });

  it("retorna 401 quando a sessão não é enviada", async () => {
    const res = await post("alterar-senha", {
      userId: 1,
      senhaAtual: "old_password",
      novaSenha: "NovaSenh@123",
    });

    expect(res.status).toBe(401);
  });

  it("retorna 403 quando o token pertence a outro usuário", async () => {
    const res = await post("alterar-senha", {
      userId: 1,
      senhaAtual: "old_password",
      novaSenha: "NovaSenh@123",
    }, createToken(2));

    expect(res.status).toBe(403);
  });

  it.todo("retorna 200 e atualiza o hash quando a senha atual está correta");
});

// ---------------------------------------------------------------------------
describe("POST /api/user/2fa/cadastrar", () => {
  it("retorna 400 quando o e-mail de destino é inválido", async () => {
    const res = await post("2fa/cadastrar", { userId: 1, destination: "nao-e-email" }, createToken(1));
    expect(res.status).toBe(400);
  });

  it("retorna 401 quando a sessão não é enviada", async () => {
    const res = await post("2fa/cadastrar", { userId: 1, destination: "valido@test.dev" });
    expect(res.status).toBe(401);
  });

  it.todo("envio o código de verificação 2FA por e-mail");
  it.todo("retorna 200 com maskedDestination quando e-mail é válido e usuário existe");
});

describe("POST /api/user/2fa/ativar", () => {
  it.todo("retorna 400 quando o código 2FA está ausente ou inválido");
  it.todo("retorna 400 quando o código 2FA expirou");
  it.todo("ativa dois_fatores_ativo = 1 quando código correto");
});

describe("POST /api/user/2fa/desativar", () => {
  it.todo("retorna 400 quando userId está ausente");
  it.todo("desativa 2FA e limpa destino quando autenticado corretamente");
});
