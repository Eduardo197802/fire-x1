import { Transacao } from "./db.js";

/**
 * Registra uma transação financeira de usuário.
 * O trigger do banco calcula automaticamente o saldo em `contas`.
 *
 * @param {Object} dados
 * @param {number} dados.userId - ID do usuário
 * @param {string} dados.tipo - Tipo: DEPOSITO, SAQUE, CREDITO_MANUAL, etc.
 * @param {string} dados.direcao - entrada ou saida
 * @param {number} dados.valor - Valor sempre positivo
 * @param {string} [dados.status='confirmado'] - pendente, confirmado, cancelado
 * @param {string} [dados.referenciaExterna] - txid PIX, requestId, etc.
 * @param {string} [dados.observacao] - Descrição livre
 * @returns {Promise<Object>} Transação criada
 */
export async function registrarTransacao(dados) {
  const {
    userId,
    tipo,
    direcao,
    valor,
    status = "confirmado",
    referenciaExterna = null,
    observacao = null
  } = dados;

  // Validações
  if (!userId || !tipo || !direcao) {
    throw new Error("userId, tipo e direcao são obrigatórios");
  }
  if (!["entrada", "saida"].includes(direcao)) {
    throw new Error("direcao deve ser 'entrada' ou 'saida'");
  }
  if (Number(valor) <= 0) {
    throw new Error("valor deve ser maior que 0");
  }
  if (!["DEPOSITO", "SAQUE", "CREDITO_MANUAL", "DEBITO_MANUAL", "CONSUMO", "PAGAMENTO_USUARIO", "COMISSAO_PLATAFORMA", "ESTORNO", "TAXA"].includes(tipo)) {
    throw new Error("tipo inválido");
  }

  // Registrar a transação
  const transacao = await Transacao.create({
    user_id: userId,
    tipo,
    direcao,
    valor: Number(valor),
    status,
    referencia_externa: referenciaExterna,
    observacao,
    criado_em: new Date()
  });

  console.log(`[Transacao] ${tipo} #${transacao.id} user=${userId} val=${valor} ${direcao}`);
  return transacao;
}

/**
 * Registra operação com comissão (disputa resolvida, pagamento recebido, etc.)
 *
 * @param {Object} dados
 * @param {number} dados.userId - ID do usuário
 * @param {number} dados.valorBruto - Valor total
 * @param {number} dados.comissaoPlataforma - Fatia da plataforma
 * @param {number} dados.valorLiquidoUsuario - Fatia do usuário (derivada)
 * @param {string} [dados.status='confirmado'] - pendente, confirmado, cancelado
 * @returns {Promise<Object>} Operação criada
 */
export async function registrarOperacao(dados) {
  const { Operacao } = await import("./db.js");
  const {
    userId,
    valorBruto,
    comissaoPlataforma,
    valorLiquidoUsuario,
    status = "confirmado"
  } = dados;

  // Validações
  if (!userId || !valorBruto || typeof comissaoPlataforma === "undefined" || !valorLiquidoUsuario) {
    throw new Error("userId, valorBruto, comissaoPlataforma e valorLiquidoUsuario são obrigatórios");
  }

  const bruto = Number(valorBruto);
  const comissao = Number(comissaoPlataforma);
  const liquido = Number(valorLiquidoUsuario);

  if (Math.abs(bruto - (comissao + liquido)) > 0.01) {
    throw new Error(`Valores inconsistentes: ${bruto} ≠ ${comissao} + ${liquido}`);
  }

  const operacao = await Operacao.create({
    user_id: userId,
    valor_bruto: bruto,
    comissao_plataforma: comissao,
    valor_liquido_usuario: liquido,
    status,
    criado_em: new Date()
  });

  console.log(`[Operacao] user=${userId} bruto=${bruto} comissao=${comissao} liquido=${liquido}`);
  return operacao;
}

/**
 * Registra movimento no caixa interno da plataforma
 *
 * @param {Object} dados
 * @param {string} dados.tipo - APORTE, COMISSAO, CUSTO, RETIRADA, etc.
 * @param {number} dados.valor - Valor sempre positivo
 * @param {string} dados.direcao - entrada ou saida
 * @param {string} [dados.observacao] - Descrição
 * @returns {Promise<Object>} Movimento criado
 */
export async function registrarCaixaPlataforma(dados) {
  const { CaixaPlataforma } = await import("./db.js");
  const { tipo, valor, direcao, observacao = null } = dados;

  if (!tipo || !valor || !direcao) {
    throw new Error("tipo, valor e direcao são obrigatórios");
  }
  if (!["entrada", "saida"].includes(direcao)) {
    throw new Error("direcao deve ser 'entrada' ou 'saida'");
  }

  const movimento = await CaixaPlataforma.create({
    tipo,
    valor: Number(valor),
    direcao,
    observacao,
    criado_em: new Date()
  });

  console.log(`[CaixaPlataforma] ${tipo} ${direcao} ${valor}`);
  return movimento;
}

export default {
  registrarTransacao,
  registrarOperacao,
  registrarCaixaPlataforma
};
