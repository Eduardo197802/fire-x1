"use client";

import { useEffect, useState } from "react";
import styles from "./usuarios.module.css";

function StatusBadge({ enabled, label }) {
  return (
    <span className={`${styles.badge} ${enabled ? styles.badgeActive : styles.badgeInactive}`}>
      {enabled ? "✓" : "✗"} {label}
    </span>
  );
}

function UsuarioRow({ usuario, onEdit }) {
  return (
    <div className={styles.row}>
      <div className={styles.cell}>{usuario.id}</div>
      <div className={styles.cell}>
        <div className={styles.emailBlock}>
          <strong>{usuario.email}</strong>
          {usuario.nome && <small>{usuario.nome}</small>}
        </div>
      </div>
      <div className={styles.cell}>
        <StatusBadge enabled={usuario.conta_liberada} label="Liberada" />
      </div>
      <div className={styles.cell}>
        <StatusBadge enabled={usuario.two_factor_enabled} label="2FA" />
      </div>
      <div className={styles.cell}>
        <button className={styles.btnEdit} onClick={() => onEdit(usuario)}>
          Editar
        </button>
      </div>
    </div>
  );
}

function EditModal({ usuario, onClose, onSave, loading }) {
  const [contaLiberada, setContaLiberada] = useState(usuario?.conta_liberada || false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(usuario?.two_factor_enabled || false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!usuario) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.modalHeader}>
          <h2>Editar Usuário</h2>
          <button className={styles.btnClose} onClick={onClose}>
            ✕
          </button>
        </header>

        <div className={styles.modalContent}>
          <div className={styles.field}>
            <label>ID</label>
            <input type="text" value={usuario.id} disabled />
          </div>

          <div className={styles.field}>
            <label>E-mail</label>
            <input type="email" value={usuario.email} disabled />
          </div>

          <div className={styles.field}>
            <label>Nome</label>
            <input type="text" value={usuario.nome || ""} disabled />
          </div>

          <div className={styles.fieldCheckbox}>
            <label>
              <input
                type="checkbox"
                checked={contaLiberada}
                onChange={(e) => setContaLiberada(e.target.checked)}
                disabled={loading}
              />
              <span>Conta Liberada</span>
            </label>
            <p className={styles.hint}>Necessário para acesso a funções administrativas.</p>
          </div>

          <div className={styles.fieldCheckbox}>
            <label>
              <input
                type="checkbox"
                checked={twoFactorEnabled}
                onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                disabled={loading}
              />
              <span>2FA Obrigatório</span>
            </label>
            <p className={styles.hint}>Garante segurança elevada para operações críticas.</p>
          </div>
        </div>

        <footer className={styles.modalFooter}>
          <button className={styles.btnSecondary} onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            className={styles.btnPrimary}
            onClick={() =>
              onSave({
                usuarioId: usuario.id,
                contaLiberada,
                twoFactorEnabled
              })
            }
            disabled={loading}
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [savingUsuario, setSavingUsuario] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/usuarios?limite=100", {
        credentials: "include",
        cache: "no-store"
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || `HTTP ${response.status}`);
      }

      setUsuarios(body.usuarios || []);
    } catch (err) {
      setError(err.message || "Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUsuario = async (updates) => {
    setSavingUsuario(true);
    try {
      const response = await fetch("/api/admin/usuarios/atualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates)
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || `HTTP ${response.status}`);
      }

      setUsuarios((prev) =>
        prev.map((u) => (u.id === updates.usuarioId ? body.usuario : u))
      );
      setEditingUsuario(null);
    } catch (err) {
      setError(err.message || "Erro ao salvar usuário.");
    } finally {
      setSavingUsuario(false);
    }
  };

  const filteredUsuarios = usuarios.filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.nome && u.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      String(u.id).includes(searchTerm)
  );

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <div>
          <h2>Gerenciar Usuários</h2>
          <p>Gestão de permissões e status de conta para operadores administrativos.</p>
        </div>
        <button className={styles.btnRefresh} onClick={loadUsuarios} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </header>

      {error && <div className={styles.errorBox}>{error}</div>}

      <div className={styles.searchBox}>
        <input
          type="text"
          placeholder="Buscar por e-mail, nome ou ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className={styles.tableContainer}>
        {loading && !usuarios.length ? (
          <p className={styles.emptyState}>Carregando usuários...</p>
        ) : filteredUsuarios.length === 0 ? (
          <p className={styles.emptyState}>Nenhum usuário encontrado.</p>
        ) : (
          <div className={styles.table}>
            <div className={styles.headerRow}>
              <div className={styles.headerCell}>ID</div>
              <div className={styles.headerCell}>E-mail / Nome</div>
              <div className={styles.headerCell}>Conta</div>
              <div className={styles.headerCell}>2FA</div>
              <div className={styles.headerCell}>Ação</div>
            </div>
            {filteredUsuarios.map((usuario) => (
              <UsuarioRow
                key={usuario.id}
                usuario={usuario}
                onEdit={setEditingUsuario}
              />
            ))}
          </div>
        )}
      </div>

      {editingUsuario && (
        <EditModal
          usuario={editingUsuario}
          onClose={() => setEditingUsuario(null)}
          onSave={handleSaveUsuario}
          loading={savingUsuario}
        />
      )}
    </section>
  );
}
