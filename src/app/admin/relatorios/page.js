import styles from "../section.module.css";

export default function AdminRelatoriosPage() {
  return (
    <section className={styles.panel}>
      <h2>Admin Relatorios</h2>
      <p>Concentrador para exportacoes PDF/Excel e filtros por periodo operacional.</p>
      <div className={styles.cardGrid}>
        <article className={styles.card}>
          <h3>Exportacao PDF</h3>
          <p>Relatorio executivo com resumo financeiro e consolidado diario.</p>
        </article>
        <article className={styles.card}>
          <h3>Exportacao Excel</h3>
          <p>Planilha detalhada por usuario, tipo e status de transacao.</p>
        </article>
        <article className={styles.card}>
          <h3>Filtros</h3>
          <p>Janela de data, turno, categorias e operador responsavel.</p>
        </article>
      </div>
    </section>
  );
}
