"use client";

import styles from "./layout.module.css";
import AdminTabs from "./AdminTabs";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }) {
  const pathname = usePathname();

  const hideAdminChrome =
    pathname === "/admin" ||
    pathname === "/admin/login" ||
    pathname === "/admin/2fa" ||
    pathname.startsWith("/admin/acesso/");

  if (hideAdminChrome) {
    return <section className={styles.wrapper}>{children}</section>;
  }

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
