import styles from "../section.module.css";

export default function AdminPixPage() {
  return (
    <section className={styles.panel}>
      <h2>Admin PIX</h2>
      <p>Monitoramento operacional de depositos, saques e eventos de webhook.</p>
      <div className={styles.cardGrid}>
        <article className={styles.card}>
          <h3>Depositos pendentes</h3>
          <p>Lista de transacoes aguardando confirmacao de pagamento.</p>
        </article>
        <article className={styles.card}>
          <h3>Saques</h3>
          <p>Acompanhamento de requisicoes de saque por status e valor.</p>
        </article>
        <article className={styles.card}>
          <h3>Webhooks</h3>
          <p>Auditoria de recebimentos com validacao por txid.</p>
        </article>
      </div>
    </section>
  );
}
