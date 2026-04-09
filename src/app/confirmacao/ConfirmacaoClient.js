"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

const digitsOnly = (value) => String(value || "").replace(/\D/g, "");

export default function ConfirmacaoClient({ initialUserId }) {
  const [code, setCode] = useState("");
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingResend, setLoadingResend] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const userId = useMemo(() => {
    if (initialUserId) return Number(initialUserId);

    try {
      const sessionData = JSON.parse(sessionStorage.getItem("firex1Verification") || "null");
      return Number(sessionData?.userId || 0);
    } catch {
      return 0;
    }
  }, [initialUserId]);

  const onVerify = async () => {
    const normalizedCode = digitsOnly(code).slice(0, 6);

    if (!userId) {
      setIsError(true);
      setMessage("Usuário de confirmação não encontrado. Refaça o cadastro.");
      return;
    }

    if (normalizedCode.length !== 6) {
      setIsError(true);
      setMessage("Digite um código com 6 dígitos.");
      return;
    }

    setLoadingVerify(true);
    setIsError(false);
    setMessage("Validando código...");

    try {
      const response = await fetch("/api/user/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          codigo: normalizedCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível validar o código.");
      }

      sessionStorage.removeItem("firex1Verification");
      setIsError(false);
      setMessage("Conta confirmada com sucesso. Faça login para continuar.");
    } catch (error) {
      setIsError(true);
      setMessage(error.message || "Erro ao confirmar código.");
    } finally {
      setLoadingVerify(false);
    }
  };

  const onResend = async () => {
    if (!userId) {
      setIsError(true);
      setMessage("Usuário de confirmação não encontrado. Refaça o cadastro.");
      return;
    }

    setLoadingResend(true);
    setIsError(false);
    setMessage("Reenviando código...");

    try {
      const response = await fetch("/api/user/reenviar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível reenviar o código.");
      }

      try {
        const existing = JSON.parse(sessionStorage.getItem("firex1Verification") || "{}");
        sessionStorage.setItem(
          "firex1Verification",
          JSON.stringify({
            ...existing,
            userId,
            channel: data.verificationChannel,
            destination: data.maskedDestination,
            previewCode: data.previewCode || ""
          })
        );
      } catch {
        sessionStorage.setItem(
          "firex1Verification",
          JSON.stringify({
            userId,
            channel: data.verificationChannel,
            destination: data.maskedDestination,
            previewCode: data.previewCode || ""
          })
        );
      }

      setIsError(false);
      setMessage("Novo código enviado com sucesso.");
    } catch (error) {
      setIsError(true);
      setMessage(error.message || "Erro ao reenviar código.");
    } finally {
      setLoadingResend(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Fire X1 Play</p>
        <h1 className={styles.title}>Confirmar cadastro</h1>
        <p className={styles.subtitle}>Digite o código enviado para concluir a liberação da sua conta.</p>

        <input
          className={styles.input}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(digitsOnly(event.target.value).slice(0, 6))}
          placeholder="000000"
          aria-label="Código de confirmação"
        />

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.buttonPrimary}
            onClick={onVerify}
            disabled={loadingVerify || loadingResend}
          >
            {loadingVerify ? "Confirmando..." : "Confirmar"}
          </button>

          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={onResend}
            disabled={loadingVerify || loadingResend}
          >
            {loadingResend ? "Reenviando..." : "Reenviar código"}
          </button>
        </div>

        <p className={`${styles.message} ${isError ? styles.error : styles.success}`}>{message}</p>
        <p className={styles.hint}>ID de confirmação: {userId || "não informado"}</p>

        <Link href="/login" className={styles.footerLink}>Ir para login</Link>
      </section>
    </main>
  );
}
