import styles from "../section.module.css";

export default function AdminSegurancaPage() {
  return (
    <section className={styles.panel}>
      <h2>Admin Seguranca</h2>
      <p>Centro de monitoramento de acesso administrativo e controles de sessao.</p>
      <div className={styles.cardGrid}>
        <article className={styles.card}>
          <h3>Tentativas de login</h3>
          <p>Visao de falhas recentes e acionamento de resposta de seguranca.</p>
        </article>
        <article className={styles.card}>
          <h3>Sessoes ativas</h3>
          <p>Revogacao manual de sessoes administrativas em caso de risco.</p>
        </article>
        <article className={styles.card}>
          <h3>Hardening</h3>
          <p>Checklist de segredo, 2FA e politicas de senha forte em producao.</p>
        </article>
      </div>
    </section>
  );
}
