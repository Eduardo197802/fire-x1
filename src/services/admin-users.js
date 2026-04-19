import { QueryTypes } from "sequelize";
import { init, sequelize } from "./db.js";

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

export const findAdminByEmail = async (email) => {
  await init;
  const normalized = normalizeEmail(email);

  const [admin] = await sequelize.query(
    `
      SELECT id, nome, email, ativo, primeiro_acesso, twofa_ativo, twofa_segredo, criado_em
      FROM usuarios_admin
      WHERE LOWER(email) = :email
      LIMIT 1
    `,
    {
      replacements: { email: normalized },
      type: QueryTypes.SELECT
    }
  );

  return admin || null;
};

export const findActiveAdminByEmail = async (email) => {
  const admin = await findAdminByEmail(email);
  if (!admin || !admin.ativo) {
    return null;
  }
  return admin;
};

export const findAdminById = async (id) => {
  await init;

  const [admin] = await sequelize.query(
    `
      SELECT id, nome, email, ativo, primeiro_acesso, twofa_ativo, twofa_segredo, criado_em
      FROM usuarios_admin
      WHERE id = :id
      LIMIT 1
    `,
    {
      replacements: { id: Number(id) || 0 },
      type: QueryTypes.SELECT
    }
  );

  return admin || null;
};

export const findActiveAdminById = async (id) => {
  const admin = await findAdminById(id);
  if (!admin || !admin.ativo) {
    return null;
  }
  return admin;
};

export const recordAdminAccessLog = async ({ adminId, acao, detalhe, ip }) => {
  await init;
  await sequelize.query(
    `
      INSERT INTO admin_access_logs (admin_id, acao, detalhe, ip, criado_em)
      VALUES (:adminId, :acao, :detalhe, :ip, NOW())
    `,
    {
      replacements: {
        adminId: Number(adminId) || null,
        acao: String(acao || "").slice(0, 120),
        detalhe: String(detalhe || "").slice(0, 500),
        ip: String(ip || "unknown").slice(0, 80)
      }
    }
  );
};

export const reserveAdminTotpStep = async ({ adminId, step, ip }) => {
  await init;

  const normalizedAdminId = Number(adminId) || 0;
  const normalizedStep = Number(step);

  if (!normalizedAdminId || !Number.isInteger(normalizedStep) || normalizedStep <= 0) {
    return false;
  }

  const detail = `step:${normalizedStep}`;
  const rows = await sequelize.query(
    `
      WITH inserted AS (
        INSERT INTO admin_access_logs (admin_id, acao, detalhe, ip, criado_em)
        SELECT :adminId, '2fa.step', :detalhe, :ip, NOW()
        WHERE NOT EXISTS (
          SELECT 1
          FROM admin_access_logs
          WHERE admin_id = :adminId
            AND acao = '2fa.step'
            AND detalhe = :detalhe
        )
        RETURNING id
      )
      SELECT id FROM inserted
    `,
    {
      replacements: {
        adminId: normalizedAdminId,
        detalhe: detail,
        ip: String(ip || "unknown").slice(0, 80)
      },
      type: QueryTypes.SELECT
    }
  );

  return rows.length > 0;
};
