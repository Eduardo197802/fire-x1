import { NextResponse } from "next/server";
import { init, sequelize } from "../../../../../services/db";
import { authenticateAdminRequest } from "../../../../../services/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await authenticateAdminRequest(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await init;

  try {
    const [transacoesCountResult] = await sequelize.query(
      "SELECT COUNT(*)::int AS total FROM transacoes"
    );

    const hasTransacoes = Number(transacoesCountResult?.[0]?.total || 0) > 0;

    const result = await sequelize.query(
      `
      SELECT
        COALESCE(SUM(CASE 
          WHEN tipo != 'COMISSAO_PLATAFORMA' AND direcao = 'entrada' THEN valor 
          ELSE 0 
        END), 0) AS total_entradas_usuarios,
        COALESCE(SUM(CASE 
          WHEN tipo = 'DEPOSITO' AND direcao = 'entrada' THEN valor 
          ELSE 0 
        END), 0) AS total_depositos,
        COALESCE(SUM(CASE 
          WHEN tipo != 'COMISSAO_PLATAFORMA' AND direcao = 'saida' THEN valor 
          ELSE 0 
        END), 0) AS total_saidas_usuarios,
        COALESCE(SUM(CASE 
          WHEN tipo = 'SAQUE' AND direcao = 'saida' THEN valor 
          ELSE 0 
        END), 0) AS total_saques,
        COALESCE(SUM(CASE 
          WHEN tipo = 'COMISSAO_PLATAFORMA' AND direcao = 'entrada' THEN valor 
          ELSE 0 
        END), 0) AS total_comissoes
      FROM transacoes
      WHERE status = 'confirmado'
      `,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (!hasTransacoes) {
      const pagamentosResult = await sequelize.query(
        `
        SELECT
          COALESCE(SUM(CASE 
            WHEN LOWER(COALESCE(tipo, '')) = 'deposito'
             AND LOWER(COALESCE(status, '')) IN ('confirmado', 'creditado', 'concluido', 'pago', 'processado', 'sucesso')
            THEN COALESCE(valor, amount, 0)
            ELSE 0
          END), 0) AS total_entradas_usuarios,
          COALESCE(SUM(CASE 
            WHEN LOWER(COALESCE(tipo, '')) = 'deposito'
             AND LOWER(COALESCE(status, '')) IN ('confirmado', 'creditado', 'concluido', 'pago', 'processado', 'sucesso')
            THEN COALESCE(valor, amount, 0)
            ELSE 0
          END), 0) AS total_depositos,
          COALESCE(SUM(CASE 
            WHEN LOWER(COALESCE(tipo, '')) = 'saque'
             AND LOWER(COALESCE(status, '')) IN ('confirmado', 'creditado', 'concluido', 'pago', 'processado', 'sucesso')
            THEN COALESCE(valor, amount, 0)
            ELSE 0
          END), 0) AS total_saidas_usuarios,
          COALESCE(SUM(CASE 
            WHEN LOWER(COALESCE(tipo, '')) = 'saque'
             AND LOWER(COALESCE(status, '')) IN ('confirmado', 'creditado', 'concluido', 'pago', 'processado', 'sucesso')
            THEN COALESCE(valor, amount, 0)
            ELSE 0
          END), 0) AS total_saques,
          0 AS total_comissoes
        FROM pagamentos
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      result[0] = pagamentosResult[0] || {};
    }

    const row = result[0] || {};
    const totalEntradas = parseFloat(row.total_entradas_usuarios || 0);
    const totalSaidas = parseFloat(row.total_saidas_usuarios || 0);
    const totalComissoes = parseFloat(row.total_comissoes || 0);

    // Receita plataforma = comissões
    const receitaPlataforma = totalComissoes;

    // Custos = saques (valor pago aos usuários)
    const custos = parseFloat(row.total_saques || 0);

    // Lucro líquido = receita - custos
    const lucroLiquido = receitaPlataforma - custos;

    return NextResponse.json({
      total_entradas: totalEntradas.toFixed(2),
      total_saidas: totalSaidas.toFixed(2),
      liquido: (totalEntradas - totalSaidas).toFixed(2),
      receita_plataforma: receitaPlataforma.toFixed(2),
      custos: custos.toFixed(2),
      lucro_liquido: lucroLiquido.toFixed(2)
    });
  } catch (error) {
    console.error(`[Admin Financeiro] Erro ao buscar resumo: ${error.message}`);
    return NextResponse.json(
      { error: "Erro ao buscar resumo financeiro." },
      { status: 500 }
    );
  }
}
