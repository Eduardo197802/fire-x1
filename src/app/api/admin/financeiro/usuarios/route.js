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

  const limiteStr = request.nextUrl.searchParams.get("limite") || "20";
  const limite = Math.min(Math.max(1, parseInt(limiteStr, 10) || 20), 100);

  await init;

  try {
    const [transacoesCountResult] = await sequelize.query(
      "SELECT COUNT(*)::int AS total FROM transacoes"
    );

    const hasTransacoes = Number(transacoesCountResult?.[0]?.total || 0) > 0;

    const result = await sequelize.query(
      `
      SELECT
        c.user_id,
        u.email,
        u.nome,
        c.saldo,
        c.atualizado_em,
        COALESCE(SUM(t.valor) FILTER (WHERE t.direcao = 'entrada' AND t.status = 'confirmado'), 0) AS total_entradas,
        COALESCE(SUM(t.valor) FILTER (WHERE t.direcao = 'saida' AND t.status = 'confirmado'), 0) AS total_saidas
      FROM contas c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN transacoes t ON c.user_id = t.user_id
      GROUP BY c.user_id, u.email, u.nome, c.saldo, c.atualizado_em
      ORDER BY c.user_id DESC
      LIMIT :limite
      `,
      {
        replacements: { limite },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (!hasTransacoes) {
      const pagamentosResult = await sequelize.query(
        `
        SELECT
          c.user_id,
          u.email,
          u.nome,
          c.saldo,
          c.atualizado_em,
          COALESCE(SUM(COALESCE(p.valor, p.amount, 0)) FILTER (
            WHERE LOWER(COALESCE(p.tipo, '')) = 'deposito'
              AND LOWER(COALESCE(p.status, '')) IN ('confirmado', 'creditado', 'concluido', 'pago', 'processado', 'sucesso')
          ), 0) AS total_entradas,
          COALESCE(SUM(COALESCE(p.valor, p.amount, 0)) FILTER (
            WHERE LOWER(COALESCE(p.tipo, '')) = 'saque'
              AND LOWER(COALESCE(p.status, '')) IN ('confirmado', 'creditado', 'concluido', 'pago', 'processado', 'sucesso')
          ), 0) AS total_saidas
        FROM contas c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN pagamentos p ON c.user_id = p.user_id
        GROUP BY c.user_id, u.email, u.nome, c.saldo, c.atualizado_em
        ORDER BY c.user_id DESC
        LIMIT :limite
        `,
        {
          replacements: { limite },
          type: sequelize.QueryTypes.SELECT
        }
      );

      result.length = 0;
      result.push(...pagamentosResult);
    }

    const usuarios = result.map((row) => ({
      user_id: row.user_id,
      email: row.email || "N/A",
      nome: row.nome || "Anônimo",
      saldo: parseFloat(row.saldo || 0).toFixed(2),
      total_entradas: parseFloat(row.total_entradas || 0).toFixed(2),
      total_saidas: parseFloat(row.total_saidas || 0).toFixed(2),
      atualizado_em: row.atualizado_em
    }));

    return NextResponse.json({
      limite,
      total_registros: usuarios.length,
      usuarios
    });
  } catch (error) {
    console.error(`[Admin Financeiro] Erro ao buscar dados por usuário: ${error.message}`);
    return NextResponse.json(
      { error: "Erro ao buscar dados de usuários." },
      { status: 500 }
    );
  }
}
