"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./layout.module.css";

const TABS = [
  { href: "/admin/financeiro", label: "Financeiro" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/pix", label: "PIX" },
  { href: "/admin/transacoes", label: "Transacoes" },
  { href: "/admin/caixa", label: "Caixa" },
  { href: "/admin/seguranca", label: "Seguranca" },
  { href: "/admin/relatorios", label: "Relatorios" }
];

export default function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav className={styles.tabs} aria-label="Abas administrativas">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.tab} ${isActive ? styles.active : ""}`.trim()}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
