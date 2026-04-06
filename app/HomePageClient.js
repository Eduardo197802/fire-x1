"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

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
  "10minutemail.com", "dispostable.com", "emailondeck.com", "fakeinbox.com",
  "guerrillamail.com", "maildrop.cc", "mailinator.com", "sharklasers.com",
  "temp-mail.org", "tempmail.com", "throwawaymail.com", "yopmail.com"
]);

const isValidCpf = (value) => {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(cpf[i]) * (10 - i);
  let firstDigit = (sum * 10) % 11;
  firstDigit = firstDigit === 10 ? 0 : firstDigit;
  if (firstDigit !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(cpf[i]) * (11 - i);
  let secondDigit = (sum * 10) % 11;
  secondDigit = secondDigit === 10 ? 0 : secondDigit;
  return secondDigit === Number(cpf[10]);
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
  if (!birthDate) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return birthDate > today;
};

const isAdult = (dateString) => {
  const birthDate = getBirthDate(dateString);
  if (!birthDate) return false;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age >= 18;
};

const isValidCellphone = (value) => {
  const digits = onlyDigits(value);
  if (digits.length !== 11) return false;
  const ddd = digits.slice(0, 2);
  const ninthDigit = digits[2];
  if (!validDdds.has(ddd) || ninthDigit !== "9") return false;
  return !/^(\d)\1{8}$/.test(digits.slice(2));
};

const formatCpf = (value) => {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

const formatPhone = (value) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
};

const initialForm = {
  nome: "",
  cpf: "",
  dataNascimento: "",
  email: "",
  celular: "",
  canalVerificacao: "email",
  senha: "",
  confirmarSenha: "",
  maiorIdade: false,
  aceiteTermos: false
};

const legalContent = {
  sobre: "A Fire X1 Play e uma plataforma digital que intermedia desafios competitivos entre usuarios, permitindo a criacao de partidas do tipo X1 com valores previamente acordados entre as partes.",
  regras: "Os jogadores devem estar conectados à sala criada na plataforma antes do início da disputa. Em caso de divergência de resultado, a disputa entra em análise pela moderação.",
  termos: "Ao utilizar a plataforma, o usuário concorda com os termos apresentados, incluindo regras de conduta e taxa operacional.",
  politica: "Coletamos dados mínimos necessários para identificação dos jogadores e funcionamento da plataforma, respeitando a LGPD."
};

function InfoModal({ title, text, onClose }) {
  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">&times;</button>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}

export default function HomePageClient() {
  const [openInfoModal, setOpenInfoModal] = useState("");
  const [openRegister, setOpenRegister] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const activeInfo = useMemo(() => {
    if (!openInfoModal) return null;
    return {
      title: openInfoModal.charAt(0).toUpperCase() + openInfoModal.slice(1),
      text: legalContent[openInfoModal]
    };
  }, [openInfoModal]);

  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
  };

  const resetForm = () => {
    setForm(initialForm);
    showMessage("", "");
  };

  const openRegisterModal = () => {
    resetForm();
    setOpenRegister(true);
  };

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      ...form,
      nome: form.nome.trim(),
      cpf: onlyDigits(form.cpf),
      email: form.email.trim(),
      celular: onlyDigits(form.celular),
      canalVerificacao: String(form.canalVerificacao || "email").trim().toLowerCase()
    };

    if (!payload.nome || !payload.cpf || !payload.dataNascimento || !payload.email || !payload.celular || !payload.senha) {
      showMessage("Preencha todos os campos obrigatórios.", "error");
      return;
    }

    if (payload.cpf.length !== 11 || !isValidCpf(payload.cpf)) {
      showMessage("Informe um CPF válido.", "error");
      return;
    }

    if (!isValidEmail(payload.email)) {
      showMessage("Informe um e-mail válido.", "error");
      return;
    }

    if (isDisposableEmail(payload.email)) {
      showMessage("Use um e-mail permanente para criar sua conta.", "error");
      return;
    }

    if (!isValidCellphone(payload.celular)) {
      showMessage("Informe um celular válido com DDD brasileiro.", "error");
      return;
    }

    if (isFutureBirthDate(payload.dataNascimento)) {
      showMessage("A data de nascimento não pode estar no futuro.", "error");
      return;
    }

    if (!isAdult(payload.dataNascimento) || !payload.maiorIdade) {
      showMessage("O cadastro é permitido apenas para maiores de 18 anos.", "error");
      return;
    }

    if (payload.senha.length < 8) {
      showMessage("A senha deve ter no mínimo 8 caracteres.", "error");
      return;
    }

    if (payload.senha !== payload.confirmarSenha) {
      showMessage("A confirmação da senha não confere.", "error");
      return;
    }

    if (!payload.aceiteTermos) {
      showMessage("Você precisa aceitar os termos para continuar.", "error");
      return;
    }

    if (payload.canalVerificacao !== "email") {
      showMessage("No momento, a confirmação está disponível apenas por e-mail.", "error");
      return;
    }

    setSubmitting(true);
    showMessage("Criando sua conta...", "success");

    try {
      const response = await fetch("/api/user/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível concluir o cadastro.");
      }

      sessionStorage.setItem("firex1Verification", JSON.stringify({
        userId: data.id,
        channel: data.verificationChannel,
        destination: data.maskedDestination,
        previewCode: data.previewCode || ""
      }));

      window.location.href = `/confirmacao?user=${encodeURIComponent(data.id)}`;
    } catch (error) {
      showMessage(error.message || "Erro ao enviar cadastro.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.mainContainer}>
        <div className={styles.logoContainer}>
          <img src="/assets/logo.png" alt="Logo" />
        </div>

        <div className={styles.links}>
          <Link href="/login" className={styles.entryLink}>Entrar</Link>
          <span className={styles.separator}>|</span>
          <button type="button" className={styles.entryButton} onClick={openRegisterModal}>Cadastrar-se</button>
        </div>
      </div>

      <footer className={styles.footer}>
        <button type="button" onClick={() => setOpenInfoModal("sobre")}>Sobre</button>
        <button type="button" onClick={() => setOpenInfoModal("regras")}>Regras</button>
        <button type="button" onClick={() => setOpenInfoModal("termos")}>Termos</button>
        <button type="button" onClick={() => setOpenInfoModal("politica")}>Política</button>
      </footer>

      {activeInfo ? (
        <InfoModal
          title={activeInfo.title}
          text={activeInfo.text}
          onClose={() => setOpenInfoModal("")}
        />
      ) : null}

      {openRegister ? (
        <div className={styles.modalBackdrop} onClick={() => setOpenRegister(false)}>
          <div className={styles.registerModal} onClick={(event) => event.stopPropagation()}>
            <button type="button" className={styles.close} onClick={() => setOpenRegister(false)} aria-label="Fechar">&times;</button>

            <div className={styles.cardHeader}>
              <p className={styles.eyebrow}>Fire X1 Play</p>
              <h2>Abra sua conta</h2>
              <p>Informe os dados exigidos para um fluxo de cadastro inicial tipo bet.</p>
            </div>

            <form className={styles.registerForm} onSubmit={onSubmit}>
              <label className={`${styles.fieldGroup} ${styles.fullWidth}`} htmlFor="nome">
                <span>Nome completo</span>
                <input id="nome" value={form.nome} onChange={(e) => handleChange("nome", e.target.value)} required />
              </label>

              <label className={styles.fieldGroup} htmlFor="cpf">
                <span>CPF</span>
                <input id="cpf" value={form.cpf} onChange={(e) => handleChange("cpf", formatCpf(e.target.value))} maxLength={14} required />
              </label>

              <label className={styles.fieldGroup} htmlFor="dataNascimento">
                <span>Data de nascimento</span>
                <input id="dataNascimento" type="date" value={form.dataNascimento} onChange={(e) => handleChange("dataNascimento", e.target.value)} required />
              </label>

              <label className={styles.fieldGroup} htmlFor="email">
                <span>E-mail</span>
                <input id="email" type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} required />
              </label>

              <label className={styles.fieldGroup} htmlFor="celular">
                <span>Celular</span>
                <input id="celular" value={form.celular} onChange={(e) => handleChange("celular", formatPhone(e.target.value))} maxLength={15} required />
              </label>

              <label className={`${styles.fieldGroup} ${styles.fullWidth}`} htmlFor="canalVerificacao">
                <span>Canal de confirmação</span>
                <select id="canalVerificacao" value={form.canalVerificacao} onChange={(e) => handleChange("canalVerificacao", e.target.value)}>
                  <option value="email">E-mail</option>
                  <option value="sms" disabled>SMS (em breve)</option>
                </select>
              </label>

              <label className={styles.fieldGroup} htmlFor="senha">
                <span>Senha</span>
                <input id="senha" type="password" value={form.senha} onChange={(e) => handleChange("senha", e.target.value)} minLength={8} required />
              </label>

              <label className={styles.fieldGroup} htmlFor="confirmarSenha">
                <span>Confirmar senha</span>
                <input id="confirmarSenha" type="password" value={form.confirmarSenha} onChange={(e) => handleChange("confirmarSenha", e.target.value)} minLength={8} required />
              </label>

              <label className={`${styles.checkRow} ${styles.fullWidth}`} htmlFor="maiorIdade">
                <input id="maiorIdade" type="checkbox" checked={form.maiorIdade} onChange={(e) => handleChange("maiorIdade", e.target.checked)} required />
                <span>Declaro que tenho 18 anos ou mais.</span>
              </label>

              <label className={`${styles.checkRow} ${styles.fullWidth}`} htmlFor="aceiteTermos">
                <input id="aceiteTermos" type="checkbox" checked={form.aceiteTermos} onChange={(e) => handleChange("aceiteTermos", e.target.checked)} required />
                <span>Li e aceito os Termos, Regras e Política de Privacidade.</span>
              </label>

              <button type="submit" className={styles.submitButton} disabled={submitting}>
                {submitting ? "Criando..." : "Criar conta"}
              </button>

              <p className={`${styles.formMessage} ${messageType === "error" ? styles.error : styles.success}`}>{message}</p>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
