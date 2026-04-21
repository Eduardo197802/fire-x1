import { Pagamento, Transacao, User, sequelize } from "./db.js";
import { addMoney, normalizeAmount } from "./money.js";
import { getPixWithdrawStatus } from "./pix.js";

const SUCCESS_STATUSES = new Set(["REALIZADO", "CONCLUIDO", "CONCLUÍDO"]);
const FAILURE_STATUSES = new Set(["FALHA", "ERRO", "REJEITADO", "CANCELADO", "CANCELADA"]);

const normalizeStatus = (status) => String(status || "").trim().toUpperCase();

const isPendingWithdraw = (pagamento) =>
  String(pagamento?.tipo || "").toLowerCase() === "saque" &&
  String(pagamento?.metodo || "").toLowerCase() === "pix" &&
  String(pagamento?.status || "").toLowerCase() === "em_processamento";

export const classifyPixWithdrawStatus = (status) => {
  const normalized = normalizeStatus(status);

  if (SUCCESS_STATUSES.has(normalized)) {
    return "concluido";
  }

  if (FAILURE_STATUSES.has(normalized)) {
    return "falha";
  }

  return "em_processamento";
};

const markWithdrawAsConcluded = async ({ pagamento, detail }) => {
  await sequelize.transaction(async (transaction) => {
    const lockedPagamento = await Pagamento.findByPk(pagamento.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!isPendingWithdraw(lockedPagamento)) {
      return;
    }

    await Pagamento.update(
      {
        status: "concluido",
        efi_end_to_end_id: detail.endToEndId || lockedPagamento.efi_end_to_end_id,
        descricao: `Saque PIX confirmado pela Efi: ${normalizeStatus(detail.status)}`,
        processado_em: new Date().toISOString(),
      },
      { where: { id: lockedPagamento.id }, transaction }
    );

    const existingTransacao = await Transacao.findOne({
      where: {
        user_id: lockedPagamento.user_id,
        tipo: "SAQUE",
        referencia_externa: lockedPagamento.txid,
      },
      transaction,
    });

    if (!existingTransacao) {
      await Transacao.create(
        {
          user_id: lockedPagamento.user_id,
          tipo: "SAQUE",
          direcao: "saida",
          valor: normalizeAmount(lockedPagamento.valor || lockedPagamento.amount),
          status: "confirmado",
          referencia_externa: lockedPagamento.txid,
          observacao: "Saque PIX confirmado pela Efi",
          criado_em: new Date(),
        },
        { transaction }
      );
    }
  });
};

const markWithdrawAsFailed = async ({ pagamento, detail }) => {
  await sequelize.transaction(async (transaction) => {
    const lockedPagamento = await Pagamento.findByPk(pagamento.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!isPendingWithdraw(lockedPagamento)) {
      return;
    }

    const user = await User.findByPk(lockedPagamento.user_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (user) {
      await User.update(
        { saldo: addMoney(user.saldo, lockedPagamento.valor || lockedPagamento.amount) },
        { where: { id: lockedPagamento.user_id }, transaction }
      );
    }

    await Pagamento.update(
      {
        status: "falha",
        descricao: `Saque PIX recusado pela Efi: ${normalizeStatus(detail.status) || "sem status"}`,
        processado_em: new Date().toISOString(),
      },
      { where: { id: lockedPagamento.id }, transaction }
    );
  });
};

export async function syncPendingPixWithdrawals({ limit = 20 } = {}) {
  const pagamentos = await Pagamento.findAll({
    where: {
      tipo: "saque",
      metodo: "pix",
      status: "em_processamento",
    },
    order: [["id", "ASC"]],
    limit,
  });

  const results = [];

  for (const pagamento of pagamentos) {
    const endToEndId = String(pagamento.efi_end_to_end_id || "").trim();

    if (!endToEndId) {
      results.push({
        id: pagamento.id,
        status: "em_processamento",
        action: "skipped",
        reason: "sem endToEndId para consulta",
      });
      continue;
    }

    try {
      const detail = await getPixWithdrawStatus({ endToEndId });
      const nextStatus = classifyPixWithdrawStatus(detail.status);

      if (nextStatus === "concluido") {
        await markWithdrawAsConcluded({ pagamento, detail });
      } else if (nextStatus === "falha") {
        await markWithdrawAsFailed({ pagamento, detail });
      }

      results.push({
        id: pagamento.id,
        status: nextStatus,
        efiStatus: normalizeStatus(detail.status) || null,
        endToEndId: detail.endToEndId || endToEndId,
        action: nextStatus === "em_processamento" ? "kept" : "updated",
      });
    } catch (error) {
      results.push({
        id: pagamento.id,
        status: "erro_consulta",
        action: "error",
        error: error?.message || "Erro ao consultar saque PIX.",
      });
    }
  }

  return {
    total: pagamentos.length,
    results,
  };
}
