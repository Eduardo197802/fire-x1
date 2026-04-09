import bcrypt from "bcryptjs";
import { Op, QueryTypes } from "sequelize";
import { NextResponse } from "next/server";
import { init, User } from "../../../../services/db";
import {
  sendBetNotificationEmail,
  sendPasswordRecoveryEmail,
  sendRegistrationConfirmationEmail,
  sendTwoFactorVerificationEmail
} from "../../../../services/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE_TTL_MINUTES = 10;

const validDdds = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "21", "22", "24", "27", "28",
  "31", "32", "33", "34", "35", "37", "38",
  "41", "42", "43", "44", "45", "46",
  "47", "48", "49",
  "51", "53", "54", "55",
  "61", "62", "63", "64", "65", "66", "67", "68", "69",
  "71", "73", "74", "75", "77", "79",
  "81", "82", "83", "84", "85", "86", "87", "88", "89",
  "91", "92", "93", "94", "95", "96", "97", "98", "99"
]);

const disposableEmailDomains = new Set([
  "10minutemail.com",
  "dispostable.com",
  "emailondeck.com",
  "fakeinbox.com",
  "guerrillamail.com",
  "maildrop.cc",
  "mailinator.com",
  "sharklasers.com",
  "temp-mail.org",
  "tempmail.com",
  "throwawaymail.com",
  "yopmail.com"
]);

const json = (body, status = 200) => NextResponse.json(body, { status });

const parseJson = async (request) => {
  try {
    return await request.json();
  } catch {
    return {};
  }
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim().toLowerCase());

const isDisposableEmail = (value) => {
  const normalizedEmail = String(value || "").trim().toLowerCase();
  const domain = normalizedEmail.split("@")[1] || "";
  return disposableEmailDomains.has(domain);
};

const getBirthDate = (dateString) => {
  const birthDate = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(birthDate.getTime()) ? null : birthDate;
};

const isFutureBirthDate = (dateString) => {
  const birthDate = getBirthDate(dateString);

  if (!birthDate) {
    return true;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return birthDate > today;
};

const isAdult = (dateString) => {
  const birthDate = getBirthDate(dateString);

  if (!birthDate) {
    return false;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 18;
};

const isValidCellphone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length !== 11) {
    return false;
  }

  const ddd = digits.slice(0, 2);
  const ninthDigit = digits[2];

  if (!validDdds.has(ddd) || ninthDigit !== "9") {
    return false;
  }

  return !/^(\d)\1{8}$/.test(digits.slice(2));
};

const isValidCpf = (value) => {
  const cpf = String(value || "").replace(/\D/g, "");

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  let sum = 0;

  for (let index = 0; index < 9; index += 1) {
    sum += Number(cpf[index]) * (10 - index);
  }

  let firstDigit = (sum * 10) % 11;
  firstDigit = firstDigit === 10 ? 0 : firstDigit;

  if (firstDigit !== Number(cpf[9])) {
    return false;
  }

  sum = 0;

  for (let index = 0; index < 10; index += 1) {
    sum += Number(cpf[index]) * (11 - index);
  }

  let secondDigit = (sum * 10) % 11;
  secondDigit = secondDigit === 10 ? 0 : secondDigit;

  return secondDigit === Number(cpf[10]);
};

const generateVerificationCode = () => String(Math.floor(100000 + Math.random() * 900000));

const getExpirationDate = () => {
  const expirationDate = new Date();
  expirationDate.setMinutes(expirationDate.getMinutes() + CODE_TTL_MINUTES);
  return expirationDate.toISOString();
};

const maskEmail = (email) => {
  const [localPart, domain] = String(email || "").split("@");

  if (!localPart || !domain) {
    return email;
  }

  const visibleLocal = localPart.slice(0, 2);
  return `${visibleLocal}${"*".repeat(Math.max(localPart.length - 2, 2))}@${domain}`;
};

const maskPhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");

  if (digits.length !== 11) {
    return phone;
  }

  return `(${digits.slice(0, 2)}) *****-${digits.slice(7)}`;
};

const getMaskedDestination = (channel, email, cellphone) =>
  channel === "sms" ? maskPhone(cellphone) : maskEmail(email);

const dispatchVerificationCode = async ({ channel, email, name, cellphone, code }) => {
  if (channel === "sms") {
    console.log(`[Fire X1] SMS pendente de integração para ${cellphone}. Código: ${code}`);
    return;
  }

  await sendRegistrationConfirmationEmail({
    to: email,
    name,
    code,
    expiresInMinutes: CODE_TTL_MINUTES
  });
};

const previewCode = (code) => (process.env.NODE_ENV === "production" ? undefined : code);

const getPath = async (paramsPromise) => {
  const params = await paramsPromise;
  const slug = params?.slug || [];
  return Array.isArray(slug) ? slug.join("/") : String(slug);
};

const postLogin = async (body) => {
  const email = String(body.email || "").trim().toLowerCase();
  const senha = String(body.senha || "");

  if (!email || !senha) {
    return json({ error: "Informe e-mail e senha." }, 400);
  }

  try {
    const user = await User.findOne({
      where: { email },
      raw: true
    });

    if (!user) {
      return json({ error: "E-mail ou senha incorretos." }, 401);
    }

    if (!user.conta_verificada) {
      return json({ error: "Conta ainda não verificada. Confirme seu e-mail." }, 403);
    }

    if (!bcrypt.compareSync(senha, user.senha_hash)) {
      return json({ error: "E-mail ou senha incorretos." }, 401);
    }

    return json({ id: user.id, nome: user.nome, email: user.email, saldo: user.saldo });
  } catch {
    return json({ error: "Erro ao consultar conta." }, 500);
  }
};

const postCriar = async (body) => {
  const {
    nome,
    cpf,
    dataNascimento,
    email,
    celular,
    canalVerificacao,
    senha,
    aceiteTermos,
    maiorIdade
  } = body;

  const normalizedNome = String(nome || "").trim();
  const normalizedCpf = String(cpf || "").replace(/\D/g, "");
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedCelular = String(celular || "").replace(/\D/g, "");
  const normalizedBirthDate = String(dataNascimento || "").trim();
  const normalizedVerificationChannel = String(canalVerificacao || "email").trim().toLowerCase();
  const plainPassword = String(senha || "");

  if (
    !normalizedNome ||
    !normalizedCpf ||
    !normalizedBirthDate ||
    !normalizedEmail ||
    !normalizedCelular ||
    !plainPassword
  ) {
    return json({ error: "Preencha todos os campos obrigatórios." }, 400);
  }

  if (normalizedCpf.length !== 11 || !isValidCpf(normalizedCpf)) {
    return json({ error: "CPF inválido." }, 400);
  }

  if (!isValidEmail(normalizedEmail)) {
    return json({ error: "E-mail inválido." }, 400);
  }

  if (isDisposableEmail(normalizedEmail)) {
    return json({ error: "Use um e-mail permanente para criar sua conta." }, 400);
  }

  if (!isValidCellphone(normalizedCelular)) {
    return json({ error: "Celular inválido. Use um número com DDD brasileiro." }, 400);
  }

  if (isFutureBirthDate(normalizedBirthDate)) {
    return json({ error: "A data de nascimento não pode estar no futuro." }, 400);
  }

  if (!isAdult(normalizedBirthDate)) {
    return json({ error: "O cadastro é permitido apenas para maiores de 18 anos." }, 400);
  }

  if (normalizedVerificationChannel !== "email") {
    return json(
      { error: "No momento, a confirmação está disponível apenas por e-mail. SMS ficará disponível em breve." },
      400
    );
  }

  if (plainPassword.length < 8) {
    return json({ error: "A senha deve ter no mínimo 8 caracteres." }, 400);
  }

  if (!aceiteTermos || !maiorIdade) {
    return json({ error: "É necessário confirmar maioridade e aceite dos termos." }, 400);
  }

  try {
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email: normalizedEmail }, { cpf: normalizedCpf }]
      },
      attributes: ["id"],
      raw: true
    });

    if (existingUser) {
      return json({ error: "Já existe uma conta com este e-mail ou CPF." }, 409);
    }

    const senhaHash = bcrypt.hashSync(plainPassword, 10);
    const verificationCode = generateVerificationCode();
    const verificationExpiry = getExpirationDate();

    const createdUser = await User.create({
      nome: normalizedNome,
      cpf: normalizedCpf,
      data_nascimento: normalizedBirthDate,
      email: normalizedEmail,
      celular: normalizedCelular,
      senha_hash: senhaHash,
      aceitou_termos: aceiteTermos ? 1 : 0,
      canal_verificacao: normalizedVerificationChannel,
      codigo_verificacao: verificationCode,
      codigo_expira_em: verificationExpiry,
      conta_verificada: 0,
      conta_liberada: 0
    });

    try {
      await dispatchVerificationCode({
        channel: normalizedVerificationChannel,
        email: normalizedEmail,
        name: normalizedNome,
        cellphone: normalizedCelular,
        code: verificationCode
      });
    } catch (emailError) {
      console.error("Erro ao enviar e-mail de confirmação:", emailError.message);
      await User.destroy({ where: { id: createdUser.id } });
      return json(
        { error: "Não foi possível enviar o e-mail de confirmação. Tente novamente em instantes." },
        502
      );
    }

    return json(
      {
        id: createdUser.id,
        nome: normalizedNome,
        cpf: normalizedCpf,
        dataNascimento: normalizedBirthDate,
        email: normalizedEmail,
        celular: normalizedCelular,
        verificationChannel: normalizedVerificationChannel,
        maskedDestination: getMaskedDestination(
          normalizedVerificationChannel,
          normalizedEmail,
          normalizedCelular
        ),
        requiresVerification: true,
        previewCode: previewCode(verificationCode)
      },
      201
    );
  } catch {
    return json({ error: "Erro ao criar usuário." }, 500);
  }
};

const postVerificar = async (body) => {
  const userId = Number(body.userId);
  const codigo = String(body.codigo || "").replace(/\D/g, "");

  if (!userId || codigo.length !== 6) {
    return json({ error: "Informe um usuário e um código válidos." }, 400);
  }

  try {
    const user = await User.findByPk(userId, {
      attributes: [
        "id",
        "email",
        "celular",
        "canal_verificacao",
        "codigo_verificacao",
        "codigo_expira_em",
        "conta_verificada"
      ],
      raw: true
    });

    if (!user) {
      return json({ error: "Conta não encontrada." }, 404);
    }

    if (user.conta_verificada) {
      return json({ success: true, contaLiberada: true });
    }

    if (!user.codigo_expira_em || new Date(user.codigo_expira_em) < new Date()) {
      return json({ error: "O código expirou. Solicite um novo envio." }, 400);
    }

    if (String(user.codigo_verificacao) !== codigo) {
      return json({ error: "Código inválido." }, 400);
    }

    await User.update(
      {
        conta_verificada: 1,
        conta_liberada: 1,
        codigo_verificacao: null,
        codigo_expira_em: null
      },
      { where: { id: userId } }
    );

    return json({ success: true, contaLiberada: true });
  } catch {
    return json({ error: "Erro ao liberar a conta." }, 500);
  }
};

const postReenviarCodigo = async (body) => {
  const userId = Number(body.userId);

  if (!userId) {
    return json({ error: "Usuário inválido." }, 400);
  }

  try {
    const user = await User.findByPk(userId, {
      attributes: ["id", "email", "celular", "canal_verificacao", "conta_verificada"],
      raw: true
    });

    if (!user) {
      return json({ error: "Conta não encontrada." }, 404);
    }

    if (user.conta_verificada) {
      return json({ error: "Esta conta já está verificada." }, 400);
    }

    const verificationCode = generateVerificationCode();
    const verificationExpiry = getExpirationDate();

    await User.update(
      {
        codigo_verificacao: verificationCode,
        codigo_expira_em: verificationExpiry
      },
      { where: { id: userId } }
    );

    try {
      await dispatchVerificationCode({
        channel: user.canal_verificacao,
        email: user.email,
        cellphone: user.celular,
        code: verificationCode
      });
    } catch (emailError) {
      console.error("Erro ao reenviar e-mail de confirmação:", emailError.message);
      return json({ error: "Não foi possível reenviar o e-mail de confirmação." }, 502);
    }

    return json({
      success: true,
      verificationChannel: user.canal_verificacao,
      maskedDestination: getMaskedDestination(user.canal_verificacao, user.email, user.celular),
      previewCode: previewCode(verificationCode)
    });
  } catch {
    return json({ error: "Erro ao reenviar o código." }, 500);
  }
};

const postRecuperarSenhaSolicitar = async (body) => {
  const normalizedEmail = String(body.email || "").trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    return json({ error: "Informe um e-mail válido." }, 400);
  }

  try {
    const user = await User.findOne({
      where: { email: normalizedEmail },
      attributes: ["id", "email"],
      raw: true
    });

    if (!user) {
      return json({ error: "Conta não encontrada para este e-mail." }, 404);
    }

    const resetCode = generateVerificationCode();
    const resetExpiry = getExpirationDate();

    await User.update(
      {
        reset_codigo: resetCode,
        reset_expira_em: resetExpiry
      },
      { where: { id: user.id } }
    );

    try {
      await sendPasswordRecoveryEmail({
        to: user.email,
        code: resetCode,
        expiresInMinutes: CODE_TTL_MINUTES
      });
    } catch (emailError) {
      console.error("Erro ao enviar e-mail de recuperação:", emailError.message);
      return json(
        { error: "Não foi possível enviar o e-mail de recuperação. Tente novamente em instantes." },
        502
      );
    }

    return json({
      success: true,
      message: "Código de recuperação enviado por e-mail.",
      previewCode: previewCode(resetCode)
    });
  } catch {
    return json({ error: "Erro ao solicitar recuperação de senha." }, 500);
  }
};

const postRecuperarSenhaRedefinir = async (body) => {
  const normalizedEmail = String(body.email || "").trim().toLowerCase();
  const resetCode = String(body.codigo || "").replace(/\D/g, "");
  const newPassword = String(body.novaSenha || "");

  if (!isValidEmail(normalizedEmail)) {
    return json({ error: "Informe um e-mail válido." }, 400);
  }

  if (resetCode.length !== 6) {
    return json({ error: "Informe um código de 6 dígitos." }, 400);
  }

  if (newPassword.length < 8) {
    return json({ error: "A nova senha deve ter no mínimo 8 caracteres." }, 400);
  }

  try {
    const user = await User.findOne({
      where: { email: normalizedEmail },
      attributes: ["id", "reset_codigo", "reset_expira_em"],
      raw: true
    });

    if (!user) {
      return json({ error: "Conta não encontrada para este e-mail." }, 404);
    }

    if (!user.reset_codigo || !user.reset_expira_em) {
      return json({ error: "Não há solicitação ativa para este e-mail." }, 400);
    }

    if (new Date(user.reset_expira_em) < new Date()) {
      return json({ error: "Código de recuperação expirado." }, 400);
    }

    if (String(user.reset_codigo) !== resetCode) {
      return json({ error: "Código de recuperação inválido." }, 400);
    }

    const senhaHash = bcrypt.hashSync(newPassword, 10);

    await User.update(
      {
        senha_hash: senhaHash,
        reset_codigo: null,
        reset_expira_em: null
      },
      { where: { id: user.id } }
    );

    return json({ success: true, message: "Senha redefinida com sucesso." });
  } catch {
    return json({ error: "Erro ao redefinir senha." }, 500);
  }
};

const postAlterarSenha = async (body) => {
  const userId = Number(body.userId);
  const senhaAtual = String(body.senhaAtual || "");
  const novaSenha = String(body.novaSenha || "");

  if (!userId) {
    return json({ error: "Usuário inválido." }, 400);
  }

  if (!senhaAtual || !novaSenha) {
    return json({ error: "Informe senha atual e nova senha." }, 400);
  }

  if (novaSenha.length < 8) {
    return json({ error: "A nova senha deve ter no mínimo 8 caracteres." }, 400);
  }

  try {
    const user = await User.findByPk(userId, {
      attributes: ["id", "senha_hash"],
      raw: true
    });

    if (!user) {
      return json({ error: "Conta não encontrada." }, 404);
    }

    if (!bcrypt.compareSync(senhaAtual, user.senha_hash)) {
      return json({ error: "A senha atual está incorreta." }, 401);
    }

    const senhaHash = bcrypt.hashSync(novaSenha, 10);

    await User.update(
      {
        senha_hash: senhaHash
      },
      { where: { id: userId } }
    );

    return json({ success: true, message: "Senha atualizada com sucesso." });
  } catch {
    return json({ error: "Erro ao atualizar senha." }, 500);
  }
};

const postSegurancaAcesso = async (body) => {
  const userId = Number(body.userId);
  const canalVerificacao = String(body.canalVerificacao || "email").trim().toLowerCase();

  if (!userId) {
    return json({ error: "Usuário inválido." }, 400);
  }

  if (canalVerificacao !== "email") {
    return json({ error: "No momento, o canal de segurança disponível é e-mail." }, 400);
  }

  try {
    const user = await User.findByPk(userId, {
      attributes: ["id"],
      raw: true
    });

    if (!user) {
      return json({ error: "Conta não encontrada." }, 404);
    }

    await User.update(
      {
        canal_verificacao: canalVerificacao
      },
      { where: { id: userId } }
    );

    return json({ success: true, message: "Configurações de segurança atualizadas." });
  } catch {
    return json({ error: "Erro ao atualizar segurança de acesso." }, 500);
  }
};

const postTwoFactorCadastrar = async (body) => {
  const userId = Number(body.userId);
  const destination = String(body.destination || "").trim().toLowerCase();

  if (!userId) {
    return json({ error: "Usuário inválido." }, 400);
  }

  if (!isValidEmail(destination)) {
    return json({ error: "Informe um e-mail válido para verificação em 2 etapas." }, 400);
  }

  try {
    const user = await User.findByPk(userId, {
      attributes: ["id"],
      raw: true
    });

    if (!user) {
      return json({ error: "Conta não encontrada." }, 404);
    }

    const verificationCode = generateVerificationCode();
    const verificationExpiry = getExpirationDate();

    await User.update(
      {
        two_factor_enabled: 0,
        two_factor_destination: destination,
        two_factor_code: verificationCode,
        two_factor_expires_at: verificationExpiry
      },
      { where: { id: userId } }
    );

    try {
      await sendTwoFactorVerificationEmail({
        to: destination,
        code: verificationCode,
        expiresInMinutes: CODE_TTL_MINUTES
      });
    } catch (emailError) {
      console.error("Erro ao enviar e-mail de 2 etapas:", emailError.message);
      return json({ error: "Não foi possível enviar o código de 2 etapas por e-mail." }, 502);
    }

    return json({
      success: true,
      message: "Código enviado para cadastrar a verificação em 2 etapas.",
      destination,
      previewCode: previewCode(verificationCode)
    });
  } catch {
    return json({ error: "Erro ao cadastrar verificação em 2 etapas." }, 500);
  }
};

const postTwoFactorAtivar = async (body) => {
  const userId = Number(body.userId);
  const code = String(body.code || "").replace(/\D/g, "");

  if (!userId) {
    return json({ error: "Usuário inválido." }, 400);
  }

  if (code.length !== 6) {
    return json({ error: "Informe um código válido de 6 dígitos." }, 400);
  }

  try {
    const user = await User.findByPk(userId, {
      attributes: ["id", "two_factor_code", "two_factor_expires_at", "two_factor_destination"],
      raw: true
    });

    if (!user) {
      return json({ error: "Conta não encontrada." }, 404);
    }

    if (!user.two_factor_code || !user.two_factor_expires_at) {
      return json({ error: "Nenhum cadastro de verificação em 2 etapas pendente." }, 400);
    }

    if (new Date(user.two_factor_expires_at) < new Date()) {
      return json({ error: "Código de 2 etapas expirado. Solicite um novo cadastro." }, 400);
    }

    if (String(user.two_factor_code) !== code) {
      return json({ error: "Código de 2 etapas inválido." }, 400);
    }

    await User.update(
      {
        two_factor_enabled: 1,
        two_factor_code: null,
        two_factor_expires_at: null
      },
      { where: { id: userId } }
    );

    return json({
      success: true,
      message: "Verificação em 2 etapas ativada com sucesso.",
      destination: user.two_factor_destination
    });
  } catch {
    return json({ error: "Erro ao ativar verificação em 2 etapas." }, 500);
  }
};

const postTwoFactorDesativar = async (body) => {
  const userId = Number(body.userId);

  if (!userId) {
    return json({ error: "Usuário inválido." }, 400);
  }

  try {
    const user = await User.findByPk(userId, {
      attributes: ["id"],
      raw: true
    });

    if (!user) {
      return json({ error: "Conta não encontrada." }, 404);
    }

    await User.update(
      {
        two_factor_enabled: 0,
        two_factor_code: null,
        two_factor_expires_at: null
      },
      { where: { id: userId } }
    );

    return json({ success: true, message: "Verificação em 2 etapas desativada." });
  } catch {
    return json({ error: "Erro ao desativar verificação em 2 etapas." }, 500);
  }
};

const postNotificacoesAposta = async (body) => {
  const userId = Number(body.userId);
  const tipo = String(body.tipo || "Atualização de aposta").trim();
  const mensagem = String(body.mensagem || "Você possui uma nova atualização de aposta.").trim();

  if (!userId) {
    return json({ error: "Usuário inválido para notificação." }, 400);
  }

  try {
    const user = await User.findByPk(userId, {
      attributes: ["email"],
      raw: true
    });

    if (!user) {
      return json({ error: "Conta não encontrada." }, 404);
    }

    try {
      await sendBetNotificationEmail({
        to: user.email,
        title: tipo,
        message: mensagem
      });
    } catch (emailError) {
      console.error("Erro ao enviar notificação de aposta:", emailError.message);
      return json({ error: "Falha ao enviar notificação de aposta por e-mail." }, 502);
    }

    return json({ success: true, message: "Notificação de aposta enviada por e-mail." });
  } catch {
    return json({ error: "Erro ao buscar usuário para notificação." }, 500);
  }
};

const getDashboard = async (userId) => {
  if (!userId) {
    return json({ error: "Usuário inválido." }, 400);
  }

  try {
    const user = await User.findByPk(userId, {
      attributes: [
        "id",
        "nome",
        "email",
        "saldo",
        "criado_em",
        "conta_verificada",
        "conta_liberada",
        "canal_verificacao"
      ],
      raw: true
    });

    if (!user) {
      return json({ error: "Conta não encontrada." }, 404);
    }

    const createdAt = user.criado_em ? new Date(user.criado_em) : null;
    const now = new Date();
    const accountAgeDays = createdAt ? Math.max(0, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24))) : 0;

    const extrato = {
      totalGanho: 0,
      totalPerdido: 0,
      jogosDisputados: 0,
      vitorias: 0,
      derrotas: 0,
      maiorApostaGanha: 0,
      maiorApostaPerdida: 0
    };

    try {
      const disputas = await User.sequelize.query(
        "SELECT valor_aposta, resultado, premio FROM disputas WHERE user_id = :userId",
        {
          replacements: { userId },
          type: QueryTypes.SELECT
        }
      );

      for (const disputa of disputas) {
        const valorAposta = Number(disputa.valor_aposta || 0);
        const premio = Number(disputa.premio || 0);
        const resultado = String(disputa.resultado || "").toLowerCase();

        extrato.jogosDisputados += 1;

        if (resultado === "ganhou") {
          extrato.vitorias += 1;
          extrato.totalGanho += premio;
          extrato.maiorApostaGanha = Math.max(extrato.maiorApostaGanha, premio);
        } else {
          extrato.derrotas += 1;
          extrato.totalPerdido += valorAposta;
          extrato.maiorApostaPerdida = Math.max(extrato.maiorApostaPerdida, valorAposta);
        }
      }

      extrato.totalGanho = Number(extrato.totalGanho.toFixed(2));
      extrato.totalPerdido = Number(extrato.totalPerdido.toFixed(2));
      extrato.maiorApostaGanha = Number(extrato.maiorApostaGanha.toFixed(2));
      extrato.maiorApostaPerdida = Number(extrato.maiorApostaPerdida.toFixed(2));
    } catch {
      // A dashboard continua funcional mesmo se a tabela de disputas ainda nao existir.
    }

    const resultadoLiquido = Number(extrato.totalGanho) - Number(extrato.totalPerdido);
    const taxaVitoria = extrato.jogosDisputados > 0 ? (Number(extrato.vitorias) / Number(extrato.jogosDisputados)) * 100 : 0;

    return json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        saldo: Number(user.saldo || 0),
        criadoEm: user.criado_em,
        contaVerificada: Boolean(user.conta_verificada),
        contaLiberada: Boolean(user.conta_liberada),
        canalVerificacao: user.canal_verificacao
      },
      metrics: {
        saldoDisponivel: Number(user.saldo || 0),
        contaVerificada: Boolean(user.conta_verificada),
        contaLiberada: Boolean(user.conta_liberada),
        diasDeConta: accountAgeDays,
        extrato: {
          ...extrato,
          resultadoLiquido,
          taxaVitoria
        }
      },
      activity: [
        {
          titulo: "Conta sincronizada",
          meta: `Dados da conta ${user.email} carregados com sucesso`,
          tempo: "agora"
        },
        {
          titulo: user.conta_verificada ? "Conta verificada" : "Verificação pendente",
          meta: user.conta_verificada
            ? "Seu cadastro já foi validado para uso da plataforma"
            : "Finalize a verificação para liberar todos os recursos",
          tempo: accountAgeDays > 0 ? `há ${accountAgeDays} dia(s)` : "hoje"
        },
        {
          titulo: "Canal principal",
          meta: `Verificação e contato principal via ${user.canal_verificacao || "email"}`,
          tempo: "status atual"
        }
      ]
    });
  } catch {
    return json({ error: "Erro ao consultar a dashboard do usuário." }, 500);
  }
};

const getStatus = async (userId) => {
  if (!userId) {
    return json({ error: "Usuário inválido." }, 400);
  }

  try {
    const user = await User.findByPk(userId, {
      attributes: [
        "id",
        "canal_verificacao",
        "conta_verificada",
        "conta_liberada",
        "email",
        "celular",
        "two_factor_enabled",
        "two_factor_destination",
        "two_factor_code",
        "two_factor_expires_at"
      ],
      raw: true
    });

    if (!user) {
      return json({ error: "Conta não encontrada." }, 404);
    }

    const twoFactorPending = Boolean(
      user.two_factor_code && user.two_factor_expires_at && new Date(user.two_factor_expires_at) > new Date()
    );

    return json({
      id: user.id,
      verificationChannel: user.canal_verificacao,
      maskedDestination: getMaskedDestination(user.canal_verificacao, user.email, user.celular),
      contaVerificada: Boolean(user.conta_verificada),
      contaLiberada: Boolean(user.conta_liberada),
      twoFactorEnabled: Boolean(user.two_factor_enabled),
      twoFactorDestination: user.two_factor_destination,
      twoFactorPending
    });
  } catch {
    return json({ error: "Erro ao consultar o status da conta." }, 500);
  }
};

const getPerfil = async (userId) => {
  if (!userId) {
    return json({ error: "Usuário inválido." }, 400);
  }

  try {
    const user = await User.findByPk(userId, {
      attributes: [
        "id",
        "nome",
        "email",
        "cpf",
        "data_nascimento",
        "celular",
        "criado_em",
        "canal_verificacao",
        "conta_verificada",
        "conta_liberada",
        "aceitou_termos",
        "two_factor_enabled",
        "two_factor_destination",
        "two_factor_code",
        "two_factor_expires_at"
      ],
      raw: true
    });

    if (!user) {
      return json({ error: "Conta não encontrada." }, 404);
    }

    const twoFactorPending = Boolean(
      user.two_factor_code && user.two_factor_expires_at && new Date(user.two_factor_expires_at) > new Date()
    );

    return json({
      id: user.id,
      nome: user.nome,
      email: user.email,
      cpf: user.cpf,
      dataNascimento: user.data_nascimento,
      celular: user.celular,
      criadoEm: user.criado_em,
      canalVerificacao: user.canal_verificacao,
      contaVerificada: Boolean(user.conta_verificada),
      contaLiberada: Boolean(user.conta_liberada),
      aceitouTermos: Boolean(user.aceitou_termos),
      twoFactorEnabled: Boolean(user.two_factor_enabled),
      twoFactorDestination: user.two_factor_destination,
      twoFactorPending
    });
  } catch {
    return json({ error: "Erro ao consultar os dados de perfil." }, 500);
  }
};

export async function POST(request, { params }) {
  await init;

  const path = await getPath(params);
  const body = await parseJson(request);

  if (path === "login") {
    return postLogin(body);
  }

  if (path === "criar") {
    return postCriar(body);
  }

  if (path === "verificar") {
    return postVerificar(body);
  }

  if (path === "reenviar-codigo") {
    return postReenviarCodigo(body);
  }

  if (path === "recuperar-senha/solicitar") {
    return postRecuperarSenhaSolicitar(body);
  }

  if (path === "recuperar-senha/redefinir") {
    return postRecuperarSenhaRedefinir(body);
  }

  if (path === "alterar-senha") {
    return postAlterarSenha(body);
  }

  if (path === "seguranca/acesso") {
    return postSegurancaAcesso(body);
  }

  if (path === "2fa/cadastrar") {
    return postTwoFactorCadastrar(body);
  }

  if (path === "2fa/ativar") {
    return postTwoFactorAtivar(body);
  }

  if (path === "2fa/desativar") {
    return postTwoFactorDesativar(body);
  }

  if (path === "notificacoes/aposta") {
    return postNotificacoesAposta(body);
  }

  return json({ error: "Rota não encontrada." }, 404);
}

export async function GET(_request, { params }) {
  await init;

  const path = await getPath(params);

  if (path.startsWith("dashboard/")) {
    const userId = Number(path.split("/")[1]);
    return getDashboard(userId);
  }

  if (path.startsWith("status/")) {
    const userId = Number(path.split("/")[1]);
    return getStatus(userId);
  }

  if (path.startsWith("perfil/")) {
    const userId = Number(path.split("/")[1]);
    return getPerfil(userId);
  }

  return json({ error: "Rota não encontrada." }, 404);
}
