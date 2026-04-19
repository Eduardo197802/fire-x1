"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../auth.module.css";

export default function AdminDashboardClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const run = async () => {
      const response = await fetch("/api/admin/auth/session", { cache: "no-store", credentials: "include" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        router.replace("/admin");
        return;
      }
      setUser(body.user || null);
      setLoading(false);
    };

    run().catch(() => {
      setError("Falha ao validar sessão administrativa.");
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return <section className={styles.authWrap}><p>Validando acesso do dashboard...</p></section>;
  }

  return (
    <section className={styles.authWrap}>
      <h1>Dashboard Admin</h1>
      <p>Acesso liberado para {user?.nome || user?.email || "administrador"}.</p>
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.linkRow}>
        <Link href="/admin/financeiro">Ir para painel financeiro</Link>
      </div>
    </section>
  );
}
