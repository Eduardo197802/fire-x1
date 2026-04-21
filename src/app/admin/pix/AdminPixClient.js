"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const statusOptions = [
  { value: "todos", label: "Todos" },
  { value: "em_processamento", label: "Em processamento" },
  { value: "concluido", label: "Concluido" },
  { value: "falha", label: "Falha" },
];

const depositStatusOptions = [
  { value: "todos", label: "Todos" },
  { value: "pendente", label: "Pendente" },
  { value: "falha", label: "Falha" },
  { value: "creditado", label: "Creditado" },
  { value: "concluido", label: "Concluido" },
];

const formatMoney = (value) => moneyFormatter.format(Number(value || 0));

const todayIso = () => new Date().toISOString().slice(0, 10);

const startIso = () => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
};

export default function AdminPixClient() {
  const [filters, setFilters] = useState({
    status: "em_processamento",
    q: "",
    userId: "",
    de: startIso(),
    ate: todayIso(),
  });
  const [saques, setSaques] = useState([]);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [manualCredit, setManualCredit] = useState({ userId: "", valor: "", referencia: "", motivo: "" });
  const [depositFilters, setDepositFilters] = useState({ status: "todos", q: "", userId: "", valor: "" });
  const [depositos, setDepositos] = useState([]);
  const [pixRequests, setPixRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limite", "50");
    params.set("status", filters.status);

    for (const key of ["q", "userId", "de", "ate"]) {
      const value = String(filters[key] || "").trim();
      if (value) {
        params.set(key, value);
      }
    }

    return params.toString();
  }, [filters]);

  const loadSaques = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/pix/saques?${query}`, {
        cache: "no-store",
        credentials: "include",
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Nao foi possivel carregar os saques PIX.");
      }

      setSaques(body.saques || []);
      setTotal(Number(body.total || 0));
      if (!body.saques?.some((item) => item.id === selectedId)) {
        setSelectedId(body.saques?.[0]?.id || null);
      }
    } catch (requestError) {
      setError(requestError.message || "Falha ao carregar saques PIX.");
    } finally {
      setLoading(false);
    }
  }, [query, selectedId]);

  const loadDetail = useCallback(async (id) => {
    if (!id) {
      setSelected(null);
      return;
    }

    setDetailLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/pix/saques/${id}`, {
        cache: "no-store",
        credentials: "include",
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Nao foi possivel detalhar o saque PIX.");
      }

      setSelected(body.saque || null);
    } catch (requestError) {
      setError(requestError.message || "Falha ao detalhar saque PIX.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadPixRequests = useCallback(async () => {
    const response = await fetch("/api/admin/pix/alteracoes?status=pendente", {
      cache: "no-store",
      credentials: "include",
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok) setPixRequests(body.solicitacoes || []);
  }, []);

  const loadDepositos = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("limite", "20");
    for (const [key, value] of Object.entries(depositFilters)) {
      const normalized = String(value || "").trim();
      if (normalized) params.set(key, normalized);
    }
    const response = await fetch(`/api/admin/pix/depositos?${params.toString()}`, {
      cache: "no-store",
      credentials: "include",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Nao foi possivel buscar depositos.");
    setDepositos(body.depositos || []);
  }, [depositFilters]);

  useEffect(() => {
    loadSaques();
    loadPixRequests();
    loadDepositos().catch(() => {});
  }, [loadDepositos, loadPixRequests, loadSaques]);

  useEffect(() => {
    loadDetail(selectedId);
  }, [loadDetail, selectedId]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const updateDepositFilter = (key, value) => {
    setDepositFilters((current) => ({ ...current, [key]: value }));
  };

  const onSyncSelected = async () => {
    if (!selected?.id) return;

    setActionLoading("sync");
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/pix/saques/${selected.id}/sincronizar`, {
        method: "POST",
        credentials: "include",
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Nao foi possivel sincronizar o saque PIX.");
      }

      setMessage(`Sincronizacao concluida: ${body.saque?.status || "sem alteracao"}.`);
      await loadSaques();
      await loadDetail(selected.id);
    } catch (requestError) {
      setError(requestError.message || "Falha ao sincronizar saque PIX.");
    } finally {
      setActionLoading("");
    }
  };

  const onRejectSelected = async () => {
    if (!selected?.id) return;

    const motivo = rejectReason.trim();
    if (motivo.length < 5) {
      setError("Informe uma justificativa com pelo menos 5 caracteres.");
      return;
    }

    setActionLoading("reject");
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/pix/saques/${selected.id}/rejeitar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ motivo }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Nao foi possivel rejeitar o saque PIX.");
      }

      setRejectReason("");
      setMessage("Saque rejeitado e saldo devolvido.");
      await loadSaques();
      await loadDetail(selected.id);
    } catch (requestError) {
      setError(requestError.message || "Falha ao rejeitar saque PIX.");
    } finally {
      setActionLoading("");
    }
  };

  const onManualCredit = async () => {
    setActionLoading("credit");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/pix/depositos/credito-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(manualCredit),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Nao foi possivel creditar deposito.");
      setManualCredit({ userId: "", valor: "", referencia: "", motivo: "" });
      setMessage(`Credito manual registrado: ${formatMoney(body.credito?.valor)}.`);
    } catch (requestError) {
      setError(requestError.message || "Falha no credito manual.");
    } finally {
      setActionLoading("");
    }
  };

  const useDepositForManualCredit = (deposito) => {
    setManualCredit({
      userId: String(deposito.userId || ""),
      valor: String(deposito.valor || ""),
      referencia: deposito.txid || deposito.referencia || "",
      motivo: `Credito manual apos conferencia do deposito ${deposito.id}`,
    });
  };

  const onDecidePixRequest = async (id, action) => {
    setActionLoading(`pix-${id}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/pix/alteracoes/${id}/decidir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, observacao: "Processado no painel PIX" }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Nao foi possivel processar solicitacao.");
      setMessage(`Solicitacao ${body.solicitacao?.status || "processada"}.`);
      await loadPixRequests();
    } catch (requestError) {
      setError(requestError.message || "Falha ao processar solicitacao.");
    } finally {
      setActionLoading("");
    }
  };

  const canOperate = selected?.status === "em_processamento";

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Admin PIX</p>
            <h1>Operacao de Saques</h1>
          </div>
          <button type="button" className={styles.primaryButton} onClick={loadSaques} disabled={loading}>
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
        </header>

        <section className={styles.filters}>
          <label>
            <span>Status</span>
            <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Busca</span>
            <input
              value={filters.q}
              onChange={(event) => updateFilter("q", event.target.value)}
              placeholder="requestId, e2eId, nome ou e-mail"
            />
          </label>
          <label>
            <span>Usuario</span>
            <input
              value={filters.userId}
              onChange={(event) => updateFilter("userId", event.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="ID"
            />
          </label>
          <label>
            <span>De</span>
            <input type="date" value={filters.de} onChange={(event) => updateFilter("de", event.target.value)} />
          </label>
          <label>
            <span>Ate</span>
            <input type="date" value={filters.ate} onChange={(event) => updateFilter("ate", event.target.value)} />
          </label>
        </section>

        {error ? <p className={styles.error}>{error}</p> : null}
        {message ? <p className={styles.success}>{message}</p> : null}

        <section className={styles.content}>
          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <h2>Saques PIX</h2>
              <span>{total} registro(s)</span>
            </div>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Usuario</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Request</th>
                    <th>E2E</th>
                  </tr>
                </thead>
                <tbody>
                  {saques.map((saque) => (
                    <tr
                      key={saque.id}
                      className={selectedId === saque.id ? styles.selectedRow : ""}
                      onClick={() => setSelectedId(saque.id)}
                    >
                      <td>{saque.id}</td>
                      <td>{saque.usuario?.email || saque.userId}</td>
                      <td>{formatMoney(saque.valor)}</td>
                      <td>
                        <span className={`${styles.badge} ${styles[`status_${saque.status}`] || ""}`}>
                          {saque.status}
                        </span>
                      </td>
                      <td>{saque.requestId || "-"}</td>
                      <td>{saque.endToEndId || "-"}</td>
                    </tr>
                  ))}
                  {!saques.length ? (
                    <tr>
                      <td colSpan={6} className={styles.empty}>
                        Nenhum saque encontrado.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>

          <aside className={styles.detail}>
            <div className={styles.panelHead}>
              <h2>Detalhe</h2>
              {detailLoading ? <span>Carregando...</span> : null}
            </div>

            {selected ? (
              <>
                <dl className={styles.detailGrid}>
                  <div>
                    <dt>ID</dt>
                    <dd>{selected.id}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{selected.status}</dd>
                  </div>
                  <div>
                    <dt>Valor</dt>
                    <dd>{formatMoney(selected.valor)}</dd>
                  </div>
                  <div>
                    <dt>Usuario</dt>
                    <dd>{selected.usuario?.email || selected.userId}</dd>
                  </div>
                  <div>
                    <dt>RequestId</dt>
                    <dd>{selected.requestId || "-"}</dd>
                  </div>
                  <div>
                    <dt>EndToEnd</dt>
                    <dd>{selected.endToEndId || "-"}</dd>
                  </div>
                  <div>
                    <dt>Chave destino</dt>
                    <dd>{selected.chavePixDestino || "-"}</dd>
                  </div>
                  <div>
                    <dt>Processado</dt>
                    <dd>{selected.processadoEm || "-"}</dd>
                  </div>
                </dl>

                <label className={styles.reason}>
                  <span>Justificativa</span>
                  <textarea
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    disabled={!canOperate || actionLoading === "reject"}
                    rows={4}
                    placeholder="Motivo para rejeicao manual"
                  />
                </label>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={onSyncSelected}
                    disabled={!canOperate || actionLoading === "sync"}
                  >
                    {actionLoading === "sync" ? "Sincronizando..." : "Sincronizar"}
                  </button>
                  <button
                    type="button"
                    className={styles.dangerButton}
                    onClick={onRejectSelected}
                    disabled={!canOperate || actionLoading === "reject"}
                  >
                    {actionLoading === "reject" ? "Rejeitando..." : "Rejeitar"}
                  </button>
                </div>

                <p className={styles.description}>{selected.descricao || "Sem descricao."}</p>
              </>
            ) : (
              <p className={styles.empty}>Selecione um saque.</p>
            )}
          </aside>
        </section>

        <section className={styles.content}>
          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <h2>Deposito com erro</h2>
              <span>Busca e credito manual auditado</span>
            </div>
            <div className={styles.filters}>
              <label>
                <span>Status</span>
                <select value={depositFilters.status} onChange={(event) => updateDepositFilter("status", event.target.value)}>
                  {depositStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Codigo/comprovante</span>
                <input value={depositFilters.q} onChange={(event) => updateDepositFilter("q", event.target.value)} />
              </label>
              <label>
                <span>Usuario</span>
                <input value={depositFilters.userId} onChange={(event) => updateDepositFilter("userId", event.target.value.replace(/\D/g, ""))} />
              </label>
              <label>
                <span>Valor</span>
                <input value={depositFilters.valor} onChange={(event) => updateDepositFilter("valor", event.target.value)} />
              </label>
              <button type="button" className={styles.secondaryButton} onClick={() => loadDepositos().catch((err) => setError(err.message))}>
                Buscar
              </button>
            </div>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Usuario</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>TXID</th>
                    <th>Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {depositos.map((deposito) => (
                    <tr key={deposito.id}>
                      <td>{deposito.id}</td>
                      <td>{deposito.usuario?.email || deposito.userId}</td>
                      <td>{formatMoney(deposito.valor)}</td>
                      <td>{deposito.status}</td>
                      <td>{deposito.txid || deposito.referencia || "-"}</td>
                      <td>
                        <button type="button" className={styles.secondaryButton} onClick={() => useDepositForManualCredit(deposito)}>
                          Usar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!depositos.length ? (
                    <tr><td colSpan={6} className={styles.empty}>Nenhum deposito encontrado.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className={styles.filters}>
              <label>
                <span>Usuario</span>
                <input value={manualCredit.userId} onChange={(event) => setManualCredit((current) => ({ ...current, userId: event.target.value.replace(/\D/g, "") }))} />
              </label>
              <label>
                <span>Valor</span>
                <input value={manualCredit.valor} onChange={(event) => setManualCredit((current) => ({ ...current, valor: event.target.value }))} placeholder="20.00" />
              </label>
              <label>
                <span>Referencia</span>
                <input value={manualCredit.referencia} onChange={(event) => setManualCredit((current) => ({ ...current, referencia: event.target.value }))} />
              </label>
              <label>
                <span>Motivo</span>
                <input value={manualCredit.motivo} onChange={(event) => setManualCredit((current) => ({ ...current, motivo: event.target.value }))} />
              </label>
              <button type="button" className={styles.primaryButton} onClick={onManualCredit} disabled={actionLoading === "credit"}>
                Creditar
              </button>
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <h2>Alteracao de PIX</h2>
              <span>{pixRequests.length} pendente(s)</span>
            </div>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Usuario</th>
                    <th>Nova chave</th>
                    <th>Status</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {pixRequests.map((request) => (
                    <tr key={request.id}>
                      <td>{request.id}</td>
                      <td>{request.email || request.user_id}</td>
                      <td>{request.nova_chave_pix}</td>
                      <td>{request.status}</td>
                      <td>
                        <div className={styles.inlineActions}>
                          <button type="button" className={styles.secondaryButton} onClick={() => onDecidePixRequest(request.id, "aprovar")}>Aprovar</button>
                          <button type="button" className={styles.dangerButton} onClick={() => onDecidePixRequest(request.id, "rejeitar")}>Rejeitar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!pixRequests.length ? (
                    <tr><td colSpan={5} className={styles.empty}>Nenhuma solicitacao pendente.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
