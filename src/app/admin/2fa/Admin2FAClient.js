"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../auth.module.css";

export default function Admin2FAClient() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const run = async () => {
      const response = await fetch("/api/admin/auth/flow-state", { cache: "no-store", credentials: "include" });
      const body = await response.json().catch(() => ({}));
      if (!body.pending || !body.login || !body.sameUser) {
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
      const response = await fetch("/admin/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code })
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "Falha na validação 2FA.");
      }

      router.replace("/admin/dashboard");
    } catch (requestError) {
      setError(requestError.message || "Falha na validação 2FA.");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return <section className={styles.authWrap}><p>Validando etapa de login...</p></section>;
  }

  return (
    <section className={styles.authWrap}>
      <h1>Verificação 2FA</h1>
      <p>Informe o código TOTP do seu app autenticador.</p>

      <form className={styles.form} onSubmit={submit}>
        <input
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
        />
        <button className={styles.btn} type="submit" disabled={loading}>
          {loading ? "Validando..." : "Validar 2FA"}
        </button>
      </form>

      {error ? <p className={styles.error}>{error}</p> : null}
    </section>
  );
}
