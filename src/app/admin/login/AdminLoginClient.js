"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../auth.module.css";

export default function AdminLoginClient() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const run = async () => {
      const response = await fetch("/api/admin/auth/flow-state", { cache: "no-store", credentials: "include" });
      const body = await response.json().catch(() => ({}));
      if (!body.pending) {
        router.replace("/admin");
        return;
      }
      setReady(true);
    };

    run().catch(() => router.replace("/admin"));
  }, [router]);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ senha })
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "Falha no login admin.");
      }

      router.replace("/admin/2fa");
    } catch (requestError) {
      setError(requestError.message || "Falha no login admin.");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return <section className={styles.authWrap}><p>Validando sessão temporária...</p></section>;
  }

  return (
    <section className={styles.authWrap}>
      <h1>Login Administrativo</h1>
      <p>Digite sua senha forte para continuar.</p>

      <form className={styles.form} onSubmit={submit}>
        <input
          type="password"
          value={senha}
          onChange={(event) => setSenha(event.target.value)}
          placeholder="Sua senha"
          autoComplete="current-password"
          required
        />
        <button className={styles.btn} type="submit" disabled={loading}>
          {loading ? "Validando..." : "Continuar"}
        </button>
      </form>

      {error ? <p className={styles.error}>{error}</p> : null}
    </section>
  );
}
