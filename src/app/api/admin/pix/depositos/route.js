import { NextResponse } from "next/server";
import { init, sequelize } from "../../../../../services/db";
import { authenticateAdminRequest } from "../../../../../services/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const parseLimit = (value) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Math.min(Math.max(Number.isFinite(parsed) && parsed > 0 ? parsed : 20, 1), 100);
};

const mapDeposito = (row) => ({
  id: Number(row.id),
  userId: Number(row.user_id),
  usuario: {
    email: row.email || "",
    nome: row.nome || "",
  },
  valor: Number(row.valor || row.amount || 0).toFixed(2),
  status: row.status || "",
  txid: row.txid || "",
  referencia: row.external_reference || "",
  brCode: row.payload_br_code || "",
  descricao: row.descricao || "",
  criadoEm: row.created_at || "",
  processadoEm: row.processado_em || "",
});

const buildFilters = (searchParams) => {
  const where = [
    "LOWER(COALESCE(p.tipo, '')) = 'deposito'",
    "LOWER(COALESCE(p.metodo, '')) = 'pix'",
  ];
  const replacements = {};

  const status = String(searchParams.get("status") || "").trim().toLowerCase();
  if (status && status !== "todos") {
    where.push("LOWER(COALESCE(p.status, '')) = :status");
    replacements.status = status;
  }

  const userId = Number(searchParams.get("userId") || 0);
  if (Number.isInteger(userId) && userId > 0) {
    where.push("p.user_id = :userId");
    replacements.userId = userId;
  }

  const valor = Number(String(searchParams.get("valor") || "").replace(",", "."));
  if (Number.isFinite(valor) && valor > 0) {
    where.push("ROUND(COALESCE(p.valor, p.amount, 0)::numeric, 2) = ROUND(:valor::numeric, 2)");
    replacements.valor = valor;
  }

  const de = String(searchParams.get("de") || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(de)) {
    where.push("p.created_at >= :de");
    replacements.de = `${de} 00:00:00`;
  }

  const ate = String(searchParams.get("ate") || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(ate)) {
    where.push("p.created_at <= :ate");
    replacements.ate = `${ate} 23:59:59`;
  }

  const q = String(searchParams.get("q") || "").trim();
  if (q) {
    where.push(
      `(p.txid ILIKE :q OR p.external_reference ILIKE :q OR p.payload_br_code ILIKE :q OR p.descricao ILIKE :q OR u.email ILIKE :q OR u.nome ILIKE :q)`
    );
    replacements.q = `%${q}%`;
  }

  return { whereSql: where.join(" AND "), replacements };
};

export async function GET(request) {
  const auth = await authenticateAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  await init;

  const limite = parseLimit(request.nextUrl.searchParams.get("limite"));
  const offset = Math.max(Number.parseInt(request.nextUrl.searchParams.get("offset") || "0", 10) || 0, 0);
  const { whereSql, replacements } = buildFilters(request.nextUrl.searchParams);

  try {
    const depositos = await sequelize.query(
      `
      SELECT
        p.id, p.user_id, u.email, u.nome, p.valor, p.amount, p.status, p.txid,
        p.external_reference, p.payload_br_code, p.descricao, p.created_at, p.processado_em
      FROM pagamentos p
      LEFT JOIN users u ON u.id = p.user_id
      WHERE ${whereSql}
      ORDER BY p.id DESC
      LIMIT :limite OFFSET :offset
      `,
      {
        replacements: { ...replacements, limite, offset },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const totalRows = await sequelize.query(
      `
      SELECT COUNT(*)::int AS total
      FROM pagamentos p
      LEFT JOIN users u ON u.id = p.user_id
      WHERE ${whereSql}
      `,
      { replacements, type: sequelize.QueryTypes.SELECT }
    );

    return NextResponse.json({
      success: true,
      total: Number(totalRows?.[0]?.total || 0),
      limite,
      offset,
      depositos: depositos.map(mapDeposito),
    });
  } catch (error) {
    console.error(`[Admin PIX] Erro ao listar depositos: ${error.message}`);
    return NextResponse.json({ error: "Erro ao listar depositos PIX." }, { status: 500 });
  }
}
