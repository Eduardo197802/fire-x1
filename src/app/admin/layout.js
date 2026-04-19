import styles from "./layout.module.css";
import AdminTabs from "./AdminTabs";

export default function AdminLayout({ children }) {
  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <h1>Painel Admin</h1>
        <p>Todas as areas administrativas centralizadas em abas.</p>
        <AdminTabs />
      </header>
      <div className={styles.content}>{children}</div>
    </section>
  );
}
