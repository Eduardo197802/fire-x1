import styles from "../section.module.css";

export default function AdminCaixaPage() {
  return (
    <section className={styles.panel}>
      <h2>Admin Caixa</h2>
      <p>Visao dedicada de caixa da plataforma com conciliacao de entradas e saidas.</p>
      <div className={styles.cardGrid}>
        <article className={styles.card}>
          <h3>Saldo atual</h3>
          <p>Apuracao do saldo de caixa por periodo e totais diarios.</p>
        </article>
        <article className={styles.card}>
          <h3>Comissoes</h3>
          <p>Conferencia da receita da plataforma por operacao.</p>
        </article>
        <article className={styles.card}>
          <h3>Eventos de ajuste</h3>
          <p>Historico de creditos, debitos e estornos administrativos.</p>
        </article>
      </div>
    </section>
  );
}
