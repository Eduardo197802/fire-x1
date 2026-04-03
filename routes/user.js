const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../db");
const {
  sendRegistrationConfirmationEmail,
  sendPasswordRecoveryEmail,
  sendBetNotificationEmail
} = require("../services/email");

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

const getMaskedDestination = (channel, email, cellphone) => {
  return channel === "sms" ? maskPhone(cellphone) : maskEmail(email);
};

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

// criar usuário
router.post("/criar", (req, res) => {
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
  } = req.body;

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
    return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
  }

  if (normalizedCpf.length !== 11) {
    return res.status(400).json({ error: "CPF inválido." });
  }

  if (!isValidCpf(normalizedCpf)) {
    return res.status(400).json({ error: "CPF inválido." });
  }

  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ error: "E-mail inválido." });
  }

  if (isDisposableEmail(normalizedEmail)) {
    return res.status(400).json({ error: "Use um e-mail permanente para criar sua conta." });
  }

  if (!isValidCellphone(normalizedCelular)) {
    return res.status(400).json({ error: "Celular inválido. Use um número com DDD brasileiro." });
  }

  if (isFutureBirthDate(normalizedBirthDate)) {
    return res.status(400).json({ error: "A data de nascimento não pode estar no futuro." });
  }

  if (!isAdult(normalizedBirthDate)) {
    return res.status(400).json({ error: "O cadastro é permitido apenas para maiores de 18 anos." });
  }

  if (normalizedVerificationChannel !== "email") {
    return res.status(400).json({
      error: "No momento, a confirmação está disponível apenas por e-mail. SMS ficará disponível em breve."
    });
  }

  if (plainPassword.length < 8) {
    return res.status(400).json({ error: "A senha deve ter no mínimo 8 caracteres." });
  }

  if (!aceiteTermos || !maiorIdade) {
    return res.status(400).json({ error: "É necessário confirmar maioridade e aceite dos termos." });
  }

  db.get(
    "SELECT id FROM users WHERE email = ? OR cpf = ?",
    [normalizedEmail, normalizedCpf],
    (selectError, existingUser) => {
      if (selectError) {
        return res.status(500).json({ error: "Erro ao validar os dados do cadastro." });
      }

      if (existingUser) {
        return res.status(409).json({ error: "Já existe uma conta com este e-mail ou CPF." });
      }

      const senhaHash = bcrypt.hashSync(plainPassword, 10);
      const verificationCode = generateVerificationCode();
      const verificationExpiry = getExpirationDate();

      db.run(
        `INSERT INTO users (
          nome,
          cpf,
          data_nascimento,
          email,
          celular,
          senha_hash,
          aceitou_termos,
          canal_verificacao,
          codigo_verificacao,
          codigo_expira_em,
          conta_verificada,
          conta_liberada
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          normalizedNome,
          normalizedCpf,
          normalizedBirthDate,
          normalizedEmail,
          normalizedCelular,
          senhaHash,
          aceiteTermos ? 1 : 0,
          normalizedVerificationChannel,
          verificationCode,
          verificationExpiry,
          0,
          0
        ],
        function (insertError) {
          if (insertError) {
            return res.status(500).json({ error: "Erro ao criar usuário." });
          }

          dispatchVerificationCode({
            channel: normalizedVerificationChannel,
            email: normalizedEmail,
            name: normalizedNome,
            cellphone: normalizedCelular,
            code: verificationCode
          })
            .then(() => {
              res.status(201).json({
                id: this.lastID,
                nome: normalizedNome,
                cpf: normalizedCpf,
                dataNascimento: normalizedBirthDate,
                email: normalizedEmail,
                celular: normalizedCelular,
                verificationChannel: normalizedVerificationChannel,
                maskedDestination: getMaskedDestination(normalizedVerificationChannel, normalizedEmail, normalizedCelular),
                requiresVerification: true,
                previewCode: previewCode(verificationCode)
              });
            })
            .catch((emailError) => {
              console.error("Erro ao enviar e-mail de confirmação:", emailError.message);

              db.run("DELETE FROM users WHERE id = ?", [this.lastID], () => {
                return res.status(502).json({
                  error: "Não foi possível enviar o e-mail de confirmação. Tente novamente em instantes."
                });
              });
            });
        }
      );
    }
  );
});

router.post("/verificar", (req, res) => {
  const userId = Number(req.body.userId);
  const codigo = String(req.body.codigo || "").replace(/\D/g, "");

  if (!userId || codigo.length !== 6) {
    return res.status(400).json({ error: "Informe um usuário e um código válidos." });
  }

  db.get(
    `SELECT id, email, celular, canal_verificacao, codigo_verificacao, codigo_expira_em, conta_verificada
     FROM users
     WHERE id = ?`,
    [userId],
    (selectError, user) => {
      if (selectError) {
        return res.status(500).json({ error: "Erro ao consultar o status da conta." });
      }

      if (!user) {
        return res.status(404).json({ error: "Conta não encontrada." });
      }

      if (user.conta_verificada) {
        return res.status(200).json({ success: true, contaLiberada: true });
      }

      if (!user.codigo_expira_em || new Date(user.codigo_expira_em) < new Date()) {
        return res.status(400).json({ error: "O código expirou. Solicite um novo envio." });
      }

      if (String(user.codigo_verificacao) !== codigo) {
        return res.status(400).json({ error: "Código inválido." });
      }

      db.run(
        `UPDATE users
         SET conta_verificada = 1,
             conta_liberada = 1,
             codigo_verificacao = NULL,
             codigo_expira_em = NULL
         WHERE id = ?`,
        [userId],
        (updateError) => {
          if (updateError) {
            return res.status(500).json({ error: "Erro ao liberar a conta." });
          }

          res.json({ success: true, contaLiberada: true });
        }
      );
    }
  );
});

router.post("/reenviar-codigo", (req, res) => {
  const userId = Number(req.body.userId);

  if (!userId) {
    return res.status(400).json({ error: "Usuário inválido." });
  }

  db.get(
    `SELECT id, email, celular, canal_verificacao, conta_verificada
     FROM users
     WHERE id = ?`,
    [userId],
    (selectError, user) => {
      if (selectError) {
        return res.status(500).json({ error: "Erro ao consultar a conta." });
      }

      if (!user) {
        return res.status(404).json({ error: "Conta não encontrada." });
      }

      if (user.conta_verificada) {
        return res.status(400).json({ error: "Esta conta já está verificada." });
      }

      const verificationCode = generateVerificationCode();
      const verificationExpiry = getExpirationDate();

      db.run(
        `UPDATE users
         SET codigo_verificacao = ?,
             codigo_expira_em = ?
         WHERE id = ?`,
        [verificationCode, verificationExpiry, userId],
        (updateError) => {
          if (updateError) {
            return res.status(500).json({ error: "Erro ao reenviar o código." });
          }

          dispatchVerificationCode({
            channel: user.canal_verificacao,
            email: user.email,
            cellphone: user.celular,
            code: verificationCode
          })
            .then(() => {
              res.json({
                success: true,
                verificationChannel: user.canal_verificacao,
                maskedDestination: getMaskedDestination(user.canal_verificacao, user.email, user.celular),
                previewCode: previewCode(verificationCode)
              });
            })
            .catch((emailError) => {
              console.error("Erro ao reenviar e-mail de confirmação:", emailError.message);
              res.status(502).json({ error: "Não foi possível reenviar o e-mail de confirmação." });
            });
        }
      );
    }
  );
});

router.post("/recuperar-senha/solicitar", (req, res) => {
  const normalizedEmail = String(req.body.email || "").trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ error: "Informe um e-mail válido." });
  }

  db.get(
    "SELECT id, email FROM users WHERE email = ?",
    [normalizedEmail],
    (selectError, user) => {
      if (selectError) {
        return res.status(500).json({ error: "Erro ao solicitar recuperação de senha." });
      }

      if (!user) {
        return res.status(404).json({ error: "Conta não encontrada para este e-mail." });
      }

      const resetCode = generateVerificationCode();
      const resetExpiry = getExpirationDate();

      db.run(
        "UPDATE users SET reset_codigo = ?, reset_expira_em = ? WHERE id = ?",
        [resetCode, resetExpiry, user.id],
        (updateError) => {
          if (updateError) {
            return res.status(500).json({ error: "Erro ao gerar código de recuperação." });
          }

          sendPasswordRecoveryEmail({
            to: user.email,
            code: resetCode,
            expiresInMinutes: CODE_TTL_MINUTES
          })
            .then(() => {
              res.json({
                success: true,
                message: "Código de recuperação enviado por e-mail.",
                previewCode: previewCode(resetCode)
              });
            })
            .catch((emailError) => {
              console.error("Erro ao enviar e-mail de recuperação:", emailError.message);
              res.status(502).json({
                error: "Não foi possível enviar o e-mail de recuperação. Tente novamente em instantes."
              });
            });
        }
      );
    }
  );
});

router.post("/recuperar-senha/redefinir", (req, res) => {
  const normalizedEmail = String(req.body.email || "").trim().toLowerCase();
  const resetCode = String(req.body.codigo || "").replace(/\D/g, "");
  const newPassword = String(req.body.novaSenha || "");

  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ error: "Informe um e-mail válido." });
  }

  if (resetCode.length !== 6) {
    return res.status(400).json({ error: "Informe um código de 6 dígitos." });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: "A nova senha deve ter no mínimo 8 caracteres." });
  }

  db.get(
    "SELECT id, reset_codigo, reset_expira_em FROM users WHERE email = ?",
    [normalizedEmail],
    (selectError, user) => {
      if (selectError) {
        return res.status(500).json({ error: "Erro ao validar recuperação de senha." });
      }

      if (!user) {
        return res.status(404).json({ error: "Conta não encontrada para este e-mail." });
      }

      if (!user.reset_codigo || !user.reset_expira_em) {
        return res.status(400).json({ error: "Não há solicitação ativa para este e-mail." });
      }

      if (new Date(user.reset_expira_em) < new Date()) {
        return res.status(400).json({ error: "Código de recuperação expirado." });
      }

      if (String(user.reset_codigo) !== resetCode) {
        return res.status(400).json({ error: "Código de recuperação inválido." });
      }

      const senhaHash = bcrypt.hashSync(newPassword, 10);

      db.run(
        `UPDATE users
         SET senha_hash = ?,
             reset_codigo = NULL,
             reset_expira_em = NULL
         WHERE id = ?`,
        [senhaHash, user.id],
        (updateError) => {
          if (updateError) {
            return res.status(500).json({ error: "Erro ao redefinir senha." });
          }

          res.json({ success: true, message: "Senha redefinida com sucesso." });
        }
      );
    }
  );
});

router.post("/notificacoes/aposta", (req, res) => {
  const userId = Number(req.body.userId);
  const tipo = String(req.body.tipo || "Atualização de aposta").trim();
  const mensagem = String(req.body.mensagem || "Você possui uma nova atualização de aposta.").trim();

  if (!userId) {
    return res.status(400).json({ error: "Usuário inválido para notificação." });
  }

  db.get("SELECT email FROM users WHERE id = ?", [userId], (selectError, user) => {
    if (selectError) {
      return res.status(500).json({ error: "Erro ao buscar usuário para notificação." });
    }

    if (!user) {
      return res.status(404).json({ error: "Conta não encontrada." });
    }

    sendBetNotificationEmail({
      to: user.email,
      title: tipo,
      message: mensagem
    })
      .then(() => {
        res.json({ success: true, message: "Notificação de aposta enviada por e-mail." });
      })
      .catch((emailError) => {
        console.error("Erro ao enviar notificação de aposta:", emailError.message);
        res.status(502).json({ error: "Falha ao enviar notificação de aposta por e-mail." });
      });
  });
});

router.get("/status/:userId", (req, res) => {
  const userId = Number(req.params.userId);

  if (!userId) {
    return res.status(400).json({ error: "Usuário inválido." });
  }

  db.get(
    `SELECT id, canal_verificacao, conta_verificada, conta_liberada, email, celular
     FROM users
     WHERE id = ?`,
    [userId],
    (selectError, user) => {
      if (selectError) {
        return res.status(500).json({ error: "Erro ao consultar o status da conta." });
      }

      if (!user) {
        return res.status(404).json({ error: "Conta não encontrada." });
      }

      res.json({
        id: user.id,
        verificationChannel: user.canal_verificacao,
        maskedDestination: getMaskedDestination(user.canal_verificacao, user.email, user.celular),
        contaVerificada: Boolean(user.conta_verificada),
        contaLiberada: Boolean(user.conta_liberada)
      });
    }
  );
});

module.exports = router;