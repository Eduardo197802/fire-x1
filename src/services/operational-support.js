import crypto from "crypto";
import { sequelize, User } from "./db.js";
import { addMoney, normalizeAmount } from "./money.js";

export const normalizePixKey = (value) => {
  const raw = String(value || "").trim();
  return raw.includes("@") ? raw.toLowerCase() : raw.replace(/\D/g, "");
};

const logAdminAction = async ({ adminId, action, detail, transaction }) => {
  await sequelize.query(
    "INSERT INTO admin_access_logs (admin_id, acao, detalhe, criado_em) VALUES (:adminId, :action, :detail, NOW())",
    {
      replacements: { adminId, action, detail: String(detail || "").slice(0, 500) },
      transaction,
    }
  );
};

export const createPixChangeRequest = async ({ userId, novaChavePix, motivo }) => {
  const user = await User.findByPk(userId, { raw: true });
  if (!user) throw new Error("Conta nao encontrada.");
  if (!user.chave_pix) throw new Error("Nao ha chave PIX cadastrada para alterar.");

  const novaChave = normalizePixKey(novaChavePix);
  if (!novaChave) throw new Error("Informe a nova chave PIX.");

  const pending = await sequelize.query(
    "SELECT id FROM pix_change_requests WHERE user_id = :userId AND status = 'pendente' LIMIT 1",
    { replacements: { userId }, type: sequelize.QueryTypes.SELECT }
  );
  if (pending[0]) throw new Error("Ja existe uma solicitacao de alteracao de PIX pendente.");

  const rows = await sequelize.query(
    `
    INSERT INTO pix_change_requests (user_id, chave_pix_atual, nova_chave_pix, motivo, status, criado_em)
    VALUES (:userId, :atual, :nova, :motivo, 'pendente', NOW())
    RETURNING id, user_id, chave_pix_atual, nova_chave_pix, motivo, status, criado_em
    `,
    {
      replacements: {
        userId,
        atual: user.chave_pix,
        nova: novaChave,
        motivo: String(motivo || "").trim(),
      },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  return rows[0];
};

export const listPixChangeRequests = async ({ status = "pendente", limit = 50 } = {}) => {
  const where = [];
  const replacements = { limit: Math.min(Math.max(Number(limit) || 50, 1), 100) };
  if (status && status !== "todos") {
    where.push("r.status = :status");
    replacements.status = status;
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return sequelize.query(
    `
    SELECT r.*, u.email, u.nome
    FROM pix_change_requests r
    LEFT JOIN users u ON u.id = r.user_id
    ${whereSql}
    ORDER BY r.id DESC
    LIMIT :limit
    `,
    { replacements, type: sequelize.QueryTypes.SELECT }
  );
};

export const decidePixChangeRequest = async ({ requestId, adminId, action, observacao }) => {
  const id = Number(requestId);
  const decision = String(action || "").toLowerCase();
  if (!["aprovar", "rejeitar"].includes(decision)) throw new Error("Acao invalida.");

  let result;
  await sequelize.transaction(async (transaction) => {
    const rows = await sequelize.query(
      "SELECT * FROM pix_change_requests WHERE id = :id FOR UPDATE",
      { replacements: { id }, type: sequelize.QueryTypes.SELECT, transaction }
    );
    const request = rows[0];
    if (!request) throw new Error("Solicitacao nao encontrada.");
    if (request.status !== "pendente") throw new Error("Solicitacao ja processada.");

    const status = decision === "aprovar" ? "aprovada" : "rejeitada";
    if (status === "aprovada") {
      await User.update(
        { chave_pix: request.nova_chave_pix },
        { where: { id: request.user_id }, transaction }
      );
    }

    await sequelize.query(
      `
      UPDATE pix_change_requests
      SET status = :status, admin_id = :adminId, admin_observacao = :observacao, processado_em = NOW()
      WHERE id = :id
      `,
      { replacements: { id, status, adminId, observacao: String(observacao || "") }, transaction }
    );

    await logAdminAction({
      adminId,
      action: `pix_chave_${status}`,
      detail: `solicitacao=${id}; user=${request.user_id}; nova=${request.nova_chave_pix}`,
      transaction,
    });

    result = { id, userId: Number(request.user_id), status };
  });
  return result;
};

export const creditManualDeposit = async ({ adminId, userId, valor, referencia, motivo }) => {
  const amount = normalizeAmount(valor);
  const reason = String(motivo || "").trim();
  if (!Number(userId)) throw new Error("Usuario invalido.");
  if (amount <= 0) throw new Error("Valor invalido.");
  if (reason.length < 5) throw new Error("Informe uma justificativa.");

  let result;
  await sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user) throw new Error("Usuario nao encontrado.");

    await User.update(
      { saldo: addMoney(user.saldo, amount) },
      { where: { id: userId }, transaction }
    );

    await sequelize.query(
      `
      INSERT INTO transacoes (user_id, tipo, direcao, valor, status, referencia_externa, observacao, criado_em)
      VALUES (:userId, 'CREDITO_MANUAL', 'entrada', :amount, 'confirmado', :referencia, :motivo, NOW())
      `,
      { replacements: { userId, amount, referencia: String(referencia || ""), motivo: reason }, transaction }
    );

    await sequelize.query(
      `
      INSERT INTO admin_financial_actions (admin_id, user_id, tipo, valor, referencia, motivo, criado_em)
      VALUES (:adminId, :userId, 'CREDITO_MANUAL_DEPOSITO', :amount, :referencia, :motivo, NOW())
      `,
      { replacements: { adminId, userId, amount, referencia: String(referencia || ""), motivo: reason }, transaction }
    );

    await logAdminAction({
      adminId,
      action: "deposito_credito_manual",
      detail: `user=${userId}; valor=${amount.toFixed(2)}; referencia=${referencia || ""}`,
      transaction,
    });

    result = { userId: Number(userId), valor: amount.toFixed(2), status: "creditado" };
  });
  return result;
};

export const createSessionRecord = async ({ userId, userAgent = "", ip = "", expiresAt }) => {
  const sessionId = crypto.randomUUID();
  const ipHash = ip ? crypto.createHash("sha256").update(String(ip)).digest("hex") : "";
  await sequelize.query(
    "UPDATE user_sessions SET status = 'revogada', revogado_em = NOW() WHERE user_id = :userId AND status = 'ativa'",
    { replacements: { userId } }
  ).catch(() => {});
  await sequelize.query(
    `
    INSERT INTO user_sessions (user_id, session_id, status, user_agent, ip_hash, criado_em, expira_em)
    VALUES (:userId, :sessionId, 'ativa', :userAgent, :ipHash, NOW(), :expiresAt)
    `,
    { replacements: { userId, sessionId, userAgent: String(userAgent || "").slice(0, 500), ipHash, expiresAt: new Date(expiresAt) } }
  ).catch(() => {});
  return sessionId;
};

export const revokeSessionRecord = async ({ userId, sessionId }) => {
  if (!userId || !sessionId) return;
  await sequelize.query(
    "UPDATE user_sessions SET status = 'revogada', revogado_em = NOW() WHERE user_id = :userId AND session_id = :sessionId",
    { replacements: { userId, sessionId } }
  ).catch(() => {});
};
