"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !senha) {
      setIsError(true);
      setMessage("Preencha e-mail e senha.");
      return;
    }

    setLoading(true);
    setIsError(false);
    setMessage("Entrando...");

    try {
      const response = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          senha
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível realizar o login.");
      }

      localStorage.setItem(
        "firex1:user",
        JSON.stringify({
          id: data.id,
          nome: data.nome,
          email: data.email,
          saldo: data.saldo
        })
      );
      setIsError(false);
      setMessage("Login realizado com sucesso.");
      router.push("/dashboard");
    } catch (error) {
      setIsError(true);
      setMessage(error.message || "Erro ao autenticar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Fire X1 Play</p>
        <h1 className={styles.title}>Entrar na conta</h1>
        <p className={styles.subtitle}>Acesse seu painel com e-mail e senha.</p>

        <form onSubmit={onSubmit} className={styles.form}>
          <label className={styles.label} htmlFor="email">
            E-mail
            <input
              id="email"
              className={styles.input}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className={styles.label} htmlFor="senha">
            <span className={styles.labelRow}>
              Senha
              <Link href="/recuperar-senha" className={styles.forgotLink}>Esqueci minha senha</Link>
            </span>
            <input
              id="senha"
              className={styles.input}
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              required
            />
          </label>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? "Validando..." : "Entrar"}
          </button>

          <p className={`${styles.message} ${isError ? styles.error : styles.success}`}>{message}</p>
        </form>

        <Link href="/" className={styles.backLink}>Voltar para início</Link>
      </section>
    </main>
  );
}
