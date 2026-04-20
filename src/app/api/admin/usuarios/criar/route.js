import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { init, User } from "../../../../../services/db.js";
import { authenticateAdminRequest } from "../../../../../services/admin-auth.js";
import { consumeRateLimit, getRequestClientIp } from "../../../../../services/rate-limit.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body, status = 200) => NextResponse.json(body, { status });

const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim().toLowerCase());

const isStrongPassword = (value) => {
  const p = String(value || "");
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/.test(p);
};

export async function POST(request) {
  const authResult = await authenticateAdminRequest(request);
  if (!authResult.ok) {
    return json({ error: authResult.error }, authResult.status);
  }

  const ip = getRequestClientIp(request) || "unknown";
  const rateLimit = consumeRateLimit({
    scope: "admin-usuarios-criar",
    key: `${ip}:${authResult.userId}`,
    limit: 10,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas requisições. Aguarde e tente novamente." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: "Corpo da requisição inválido." }, 400);
  }

  const email = String(body.email || "").trim().toLowerCase();
  const nome = String(body.nome || "").trim();
  const senha = String(body.senha || "");

  if (!isValidEmail(email)) {
    return json({ error: "E-mail inválido." }, 400);
  }

  if (!nome) {
    return json({ error: "Nome obrigatório." }, 400);
  }

  if (!isStrongPassword(senha)) {
    return json(
      {
        error:
          "Senha fraca. Use no mínimo 8 caracteres com maiúscula, minúscula, número e símbolo."
      },
      400
    );
  }

  await init;

  const existing = await User.findOne({ where: { email }, attributes: ["id"], raw: true });
  if (existing) {
    return json({ error: "Já existe um usuário com este e-mail." }, 409);
  }

  const senhaHash = bcrypt.hashSync(senha, 12);

  const novoUsuario = await User.create({
    email,
    nome,
    senha_hash: senhaHash,
    conta_liberada: 0,
    two_factor_enabled: 0,
    aceitou_termos: 0,
    conta_verificada: 0
  });

  return json(
    {
      success: true,
      message: "Usuário criado com sucesso.",
      usuario: {
        id: novoUsuario.id,
        email: novoUsuario.email,
        nome: novoUsuario.nome,
        conta_liberada: novoUsuario.conta_liberada,
        two_factor_enabled: novoUsuario.two_factor_enabled
      }
    },
    201
  );
}
