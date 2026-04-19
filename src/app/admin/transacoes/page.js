import styles from "../section.module.css";

export default function AdminTransacoesPage() {
  return (
    <section className={styles.panel}>
      <h2>Admin Transacoes</h2>
      <p>Extrato consolidado com trilha de auditoria financeira da plataforma.</p>
      <div className={styles.cardGrid}>
        <article className={styles.card}>
          <h3>Filtros</h3>
          <p>Periodo, usuario, tipo, direcao e status da movimentacao.</p>
        </article>
        <article className={styles.card}>
          <h3>Conferencia</h3>
          <p>Revisao de divergencias entre pagamentos e transacoes registradas.</p>
        </article>
        <article className={styles.card}>
          <h3>Rastreabilidade</h3>
          <p>Consulta por referencia externa, txid e requestId.</p>
        </article>
      </div>
    </section>
  );
}
