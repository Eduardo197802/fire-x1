import { NextResponse } from "next/server";
import { init, sequelize } from "../../../../../services/db";
import { authenticateAdminRequest } from "../../../../../services/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const parsePositiveInt = (value, fallback, max = 100) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, max);
};

const parseOffset = (value) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const mapSaque = (row) => ({
  id: Number(row.id),
  userId: Number(row.user_id),
  usuario: {
    email: row.email || "",
    nome: row.nome || "",
  },
  valor: Number(row.valor || row.amount || 0).toFixed(2),
  status: row.status || "",
  requestId: row.txid || row.external_reference || "",
  endToEndId: row.efi_end_to_end_id || "",
  chavePixDestino: row.chave_pix_destino || "",
  descricao: row.descricao || "",
  processadoEm: row.processado_em || "",
  criadoEm: row.created_at || "",
});

const buildFilters = (searchParams) => {
  const where = [
    "LOWER(COALESCE(p.tipo, '')) = 'saque'",
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
      `(p.txid ILIKE :q OR p.external_reference ILIKE :q OR p.efi_end_to_end_id ILIKE :q OR u.email ILIKE :q OR u.nome ILIKE :q)`
    );
    replacements.q = `%${q}%`;
  }

  return {
    whereSql: where.join(" AND "),
    replacements,
  };
};

export async function GET(request) {
  const auth = await authenticateAdminRequest(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await init;

  const limite = parsePositiveInt(request.nextUrl.searchParams.get("limite"), 20, 100);
  const offset = parseOffset(request.nextUrl.searchParams.get("offset"));
  const { whereSql, replacements } = buildFilters(request.nextUrl.searchParams);

  try {
    const saques = await sequelize.query(
      `
      SELECT
        p.id,
        p.user_id,
        u.email,
        u.nome,
        p.valor,
        p.amount,
        p.status,
        p.txid,
        p.external_reference,
        p.efi_end_to_end_id,
        p.chave_pix_destino,
        p.descricao,
        p.processado_em,
        p.created_at
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
      {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      }
    );

    return NextResponse.json({
      success: true,
      filtros: {
        status: request.nextUrl.searchParams.get("status") || "todos",
        userId: request.nextUrl.searchParams.get("userId") || "",
        de: request.nextUrl.searchParams.get("de") || "",
        ate: request.nextUrl.searchParams.get("ate") || "",
        q: request.nextUrl.searchParams.get("q") || "",
      },
      total: Number(totalRows?.[0]?.total || 0),
      limite,
      offset,
      saques: saques.map(mapSaque),
    });
  } catch (error) {
    console.error(`[Admin PIX] Erro ao listar saques: ${error.message}`);
    return NextResponse.json(
      { error: "Erro ao listar saques PIX." },
      { status: 500 }
    );
  }
}
