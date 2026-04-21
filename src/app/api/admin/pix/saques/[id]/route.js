import { NextResponse } from "next/server";
import { init, sequelize } from "../../../../../../services/db";
import { authenticateAdminRequest } from "../../../../../../services/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mapSaqueDetail = (row) => ({
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
  requestId: row.txid || row.external_reference || "",
  endToEndId: row.efi_end_to_end_id || "",
  chavePixDestino: row.chave_pix_destino || "",
  descricao: row.descricao || "",
  processadoEm: row.processado_em || "",
  criadoEm: row.created_at || "",
  gateway: row.gateway || "",
  origem: row.origem || "",
});

export async function GET(request, context) {
  const auth = await authenticateAdminRequest(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const params = await context.params;
  const id = Number(params?.id || 0);

  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "ID de saque inválido." }, { status: 400 });
  }

  await init;

  try {
    const rows = await sequelize.query(
      `
      SELECT
        p.id,
        p.user_id,
        u.email,
        u.nome,
        u.cpf,
        u.celular,
        p.valor,
        p.amount,
        p.status,
        p.txid,
        p.external_reference,
        p.efi_end_to_end_id,
        p.chave_pix_destino,
        p.descricao,
        p.processado_em,
        p.created_at,
        p.gateway,
        p.origem
      FROM pagamentos p
      LEFT JOIN users u ON u.id = p.user_id
      WHERE p.id = :id
        AND LOWER(COALESCE(p.tipo, '')) = 'saque'
        AND LOWER(COALESCE(p.metodo, '')) = 'pix'
      LIMIT 1
      `,
      {
        replacements: { id },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (!rows[0]) {
      return NextResponse.json({ error: "Saque PIX não encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      saque: mapSaqueDetail(rows[0]),
    });
  } catch (error) {
    console.error(`[Admin PIX] Erro ao detalhar saque: ${error.message}`);
    return NextResponse.json(
      { error: "Erro ao detalhar saque PIX." },
      { status: 500 }
    );
  }
}
