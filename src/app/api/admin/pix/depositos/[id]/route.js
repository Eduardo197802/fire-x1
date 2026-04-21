import { NextResponse } from "next/server";
import { init, sequelize } from "../../../../../../services/db";
import { authenticateAdminRequest } from "../../../../../../services/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, context) {
  const auth = await authenticateAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const params = await context.params;
  const id = Number(params?.id || 0);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "ID de deposito invalido." }, { status: 400 });
  }

  await init;

  try {
    const rows = await sequelize.query(
      `
      SELECT
        p.id, p.user_id, u.email, u.nome, u.cpf, u.celular, p.valor, p.amount, p.status,
        p.txid, p.external_reference, p.payload_br_code, p.qr_code_imagem, p.descricao,
        p.webhook_recebido_em, p.processado_em, p.created_at, p.gateway, p.origem
      FROM pagamentos p
      LEFT JOIN users u ON u.id = p.user_id
      WHERE p.id = :id
        AND LOWER(COALESCE(p.tipo, '')) = 'deposito'
        AND LOWER(COALESCE(p.metodo, '')) = 'pix'
      LIMIT 1
      `,
      { replacements: { id }, type: sequelize.QueryTypes.SELECT }
    );

    if (!rows[0]) return NextResponse.json({ error: "Deposito PIX nao encontrado." }, { status: 404 });

    const row = rows[0];
    return NextResponse.json({
      success: true,
      deposito: {
        id: Number(row.id),
        userId: Number(row.user_id),
        usuario: {
          email: row.email || "",
          nome: row.nome || "",
          cpf: row.cpf || "",
          celular: row.celular || "",
        },
        valor: Number(row.valor || row.amount || 0).toFixed(2),
        status: row.status || "",
        txid: row.txid || "",
        referencia: row.external_reference || "",
        brCode: row.payload_br_code || "",
        qrCodeImagem: row.qr_code_imagem || "",
        descricao: row.descricao || "",
        webhookRecebidoEm: row.webhook_recebido_em || "",
        processadoEm: row.processado_em || "",
        criadoEm: row.created_at || "",
        gateway: row.gateway || "",
        origem: row.origem || "",
      },
    });
  } catch (error) {
    console.error(`[Admin PIX] Erro ao detalhar deposito: ${error.message}`);
    return NextResponse.json({ error: "Erro ao detalhar deposito PIX." }, { status: 500 });
  }
}
