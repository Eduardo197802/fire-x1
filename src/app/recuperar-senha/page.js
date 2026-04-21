"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

const STEP_EMAIL = "email";
const STEP_CODIGO = "codigo";
const STEP_CONCLUIDO = "concluido";

export default function RecuperarSenhaPage() {
  const [step, setStep] = useState(STEP_EMAIL);
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState("email");
  const [codigo, setCodigo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const setMsg = (text, error = false) => {
    setMessage(text);
    setIsError(error);
  };

  const handleSolicitarCodigo = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      setMsg("Informe seu e-mail.", true);
      return;
    }

    setLoading(true);
    setMsg("Enviando código...");

    try {
      const res = await fetch("/api/user/recuperar-senha/solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), channel }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Não foi possível enviar o código.");
      }

      setMsg("Código enviado para seu e-mail.");
      setStep(STEP_CODIGO);
    } catch (err) {
      setMsg(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleRedefinirSenha = async (event) => {
    event.preventDefault();

    if (codigo.replace(/\D/g, "").length !== 6) {
      setMsg("Informe o código de 6 dígitos.", true);
      return;
    }

    if (novaSenha.length < 8) {
      setMsg("A nova senha deve ter no mínimo 8 caracteres.", true);
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setMsg("As senhas não conferem.", true);
      return;
    }

    setLoading(true);
    setMsg("Redefinindo senha...");

    try {
      const res = await fetch("/api/user/recuperar-senha/redefinir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          codigo: codigo.replace(/\D/g, ""),
          novaSenha,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Não foi possível redefinir a senha.");
      }

      setMsg("Senha redefinida com sucesso!");
      setStep(STEP_CONCLUIDO);
    } catch (err) {
      setMsg(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Fire X1 Play</p>

        {step === STEP_EMAIL && (
          <>
            <h1 className={styles.title}>Esqueci minha senha</h1>
            <p className={styles.subtitle}>
              Informe seu e-mail para receber um código de recuperação.
            </p>

            <form onSubmit={handleSolicitarCodigo} className={styles.form}>
              <label className={styles.label} htmlFor="email">
                E-mail
                <input
                  id="email"
                  className={styles.input}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>

              <label className={styles.label} htmlFor="channel">
                Canal de envio
                <select
                  id="channel"
                  className={styles.input}
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                >
                  <option value="email">E-mail</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </label>

              <button type="submit" className={styles.button} disabled={loading}>
                {loading ? "Enviando..." : "Enviar código"}
              </button>

              <p className={`${styles.message} ${isError ? styles.error : styles.success}`}>
                {message}
              </p>
            </form>
          </>
        )}

        {step === STEP_CODIGO && (
          <>
            <h1 className={styles.title}>Redefinir senha</h1>
            <p className={styles.subtitle}>
              Digite o código de 6 dígitos enviado para <strong>{email}</strong> e crie uma nova senha.
            </p>

            <form onSubmit={handleRedefinirSenha} className={styles.form}>
              <label className={styles.label} htmlFor="codigo">
                Código de verificação
                <input
                  id="codigo"
                  className={styles.input}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </label>

              <label className={styles.label} htmlFor="novaSenha">
                Nova senha
                <input
                  id="novaSenha"
                  className={styles.input}
                  type="password"
                  autoComplete="new-password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  required
                />
              </label>

              <label className={styles.label} htmlFor="confirmarSenha">
                Confirmar nova senha
                <input
                  id="confirmarSenha"
                  className={styles.input}
                  type="password"
                  autoComplete="new-password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  required
                />
              </label>

              <button type="submit" className={styles.button} disabled={loading}>
                {loading ? "Salvando..." : "Redefinir senha"}
              </button>

              <p className={`${styles.message} ${isError ? styles.error : styles.success}`}>
                {message}
              </p>
            </form>

            <button
              type="button"
              className={styles.textButton}
              onClick={() => { setStep(STEP_EMAIL); setMsg(""); }}
            >
              Usar outro e-mail
            </button>
          </>
        )}

        {step === STEP_CONCLUIDO && (
          <div className={styles.concluido}>
            <p className={styles.concluidoIcon}>✓</p>
            <h1 className={styles.title}>Senha redefinida!</h1>
            <p className={styles.subtitle}>
              Sua senha foi atualizada com sucesso. Você já pode entrar na sua conta.
            </p>
            <Link href="/login" className={styles.button} style={{ textDecoration: "none", textAlign: "center", display: "block", lineHeight: "46px" }}>
              Ir para o login
            </Link>
          </div>
        )}

        <Link href="/login" className={styles.backLink}>
          Voltar para o login
        </Link>
      </section>
    </main>
  );
}
