import GerencianetModule from "gn-api-sdk-node";
import path from "path";
import { fileURLToPath } from "url";

const Gerencianet = GerencianetModule?.default || GerencianetModule;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Configuração PIX ausente: ${name}`);
  }

  return value;
}

function buildOptions() {
  const certPath = process.env.EFI_CERT_PATH;
  const resolvedCertPath = certPath 
    ? path.resolve(/*turbopackIgnore: true*/ process.cwd(), certPath)
    : path.resolve(__dirname, "..", "..", "Efi Bank", "certificado.pem");

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
