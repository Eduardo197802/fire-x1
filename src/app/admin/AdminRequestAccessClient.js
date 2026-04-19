"use client";

import { useState } from "react";
import styles from "./auth.module.css";

export default function AdminRequestAccessClient() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/admin/solicitar-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const body = await response.json().catch(() => ({}));
      setMessage(body.mensagem || "Se o e-mail estiver autorizado, você receberá um link de acesso.");
    } catch {
      setMessage("Se o e-mail estiver autorizado, você receberá um link de acesso.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.authWrap}>
      <h1>Acesso Administrativo</h1>
      <p>Informe seu e-mail para solicitar um link temporário de acesso.</p>

      <form className={styles.form} onSubmit={submit}>
        <input
          type="email"
          placeholder="admin@dominio.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <button className={styles.btn} type="submit" disabled={loading}>
          {loading ? "Enviando..." : "Solicitar link"}
        </button>
      </form>

      {message ? <p className={styles.ok}>{message}</p> : null}
    </section>
  );
}
