import GerencianetModule from "gn-api-sdk-node";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const Gerencianet = GerencianetModule?.default || GerencianetModule;
const moduleDir = path.dirname(fileURLToPath(import.meta.url));

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Configuração PIX ausente: ${name}`);
  }

  return value;
}

function resolveCertPath() {
  const certPathEnv = process.env.EFI_CERT_PATH;
  
  if (!certPathEnv) {
    throw new Error("EFI_CERT_PATH não configurado");
  }

  // Se o caminho já é absoluto, usa direto
  if (certPathEnv.startsWith('/')) {
    return certPathEnv;
  }

  // Tenta resolver relativo ao cwd (onde Next.js será executado)
  const fromCwd = path.resolve(/*turbopackIgnore: true*/ process.cwd(), certPathEnv);
  if (fs.existsSync(fromCwd)) {
    return fromCwd;
  }

  // Tenta relativo ao projeto root
  const fromProjectRoot = path.resolve(moduleDir, "..", "..", certPathEnv);
  if (fs.existsSync(fromProjectRoot)) {
    return fromProjectRoot;
  }

  // Tenta caminho absoluto em produção
  const prodPath = `/home/fire-x1/application/fire-x1/${certPathEnv}`;
  if (fs.existsSync(prodPath)) {
    return prodPath;
  }

  // Se nenhum existir, retorna o melhor palpite
  console.error(`[PIX] Nenhum destes caminhos existe:
    - ${fromCwd}
    - ${fromProjectRoot}
    - ${prodPath}
  `);
  
  return prodPath;
}

function buildOptions() {
  const resolvedCertPath = resolveCertPath();

  return {
    client_id: requireEnv("EFI_CLIENT_ID"),
    client_secret: requireEnv("EFI_CLIENT_SECRET"),
    sandbox: String(process.env.EFI_SANDBOX || "false").toLowerCase() === "true",
    certificate: resolvedCertPath,
  };
}

export async function createPixDepositCharge({ valor, userId }) {
  const api = new Gerencianet(buildOptions());
  const chavePix = requireEnv("EFI_PIX_KEY");

  const body = {
    calendario: { expiracao: 3600 },
    valor: { original: Number(valor).toFixed(2) },
    chave: chavePix,
    solicitacaoPagador: `Deposito usuario ${userId}`,
  };

  const response = await api.pixCreateImmediateCharge([], body);

  const txid =
    response?.txid ||
    response?.loc?.id?.toString?.() ||
    response?.pixCopiaECola ||
    `pix-${Date.now()}`;

  return {
    txid,
    brCode: response?.pixCopiaECola || response?.qrCode || null,
    qrCodeImage: response?.imagemQrcode || response?.qrcode || null,
    raw: response,
  };
}

export async function sendPixWithdraw({ valor, chavePix, requestId }) {
  const api = new Gerencianet(buildOptions());

  const body = {
    valor: Number(valor).toFixed(2),
    pagador: {
      chave: chavePix,
    },
    infoPagador: `Saque request ${requestId}`,
  };

  const response = await api.pixSend({}, body);

  return {
    endToEndId: response?.endToEndId || response?.e2eId || null,
    raw: response,
  };
}
