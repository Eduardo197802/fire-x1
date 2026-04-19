import { NextResponse } from "next/server";
import { init, sequelize } from "../../../../../services/db";
import { authenticateAdminRequest } from "../../../../../services/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidDate(dateStr) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
}

export async function GET(request) {
  const auth = await authenticateAdminRequest(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const de = request.nextUrl.searchParams.get("de");
  const ate = request.nextUrl.searchParams.get("ate");

  if (!de || !isValidDate(de)) {
    return NextResponse.json(
      { error: "Parâmetro 'de' é obrigatório e deve estar no formato YYYY-MM-DD." },
      { status: 400 }
    );
  }

  if (!ate || !isValidDate(ate)) {
    return NextResponse.json(
      { error: "Parâmetro 'ate' é obrigatório e deve estar no formato YYYY-MM-DD." },
      { status: 400 }
    );
  }

  await init;

  try {
    const result = await sequelize.query(
      `
      SELECT
        DATE(criado_em) AS data,
        COUNT(*) FILTER (WHERE direcao = 'entrada') AS qtd_entradas,
        COUNT(*) FILTER (WHERE direcao = 'saida') AS qtd_saidas,
        COALESCE(SUM(valor) FILTER (WHERE direcao = 'entrada'), 0) AS total_entradas,
        COALESCE(SUM(valor) FILTER (WHERE direcao = 'saida'), 0) AS total_saidas
      FROM transacoes
      WHERE status = 'confirmado'
        AND DATE(criado_em) >= :de
        AND DATE(criado_em) <= :ate
      GROUP BY DATE(criado_em)
      ORDER BY DATE(criado_em) ASC
      `,
      {
        replacements: { de, ate },
        type: sequelize.QueryTypes.SELECT
      }
    );

    const diarios = result.map((row) => ({
      data: row.data,
      qtd_entradas: row.qtd_entradas || 0,
      qtd_saidas: row.qtd_saidas || 0,
      total_entradas: parseFloat(row.total_entradas || 0).toFixed(2),
      total_saidas: parseFloat(row.total_saidas || 0).toFixed(2)
    }));

    return NextResponse.json({
      periodos: {
        de,
        ate
      },
      total_dias: diarios.length,
      diarios
    });
  } catch (error) {
    console.error(`[Admin Financeiro] Erro ao buscar dados diários: ${error.message}`);
    return NextResponse.json(
      { error: "Erro ao buscar relatório diário." },
      { status: 500 }
    );
  }
}
