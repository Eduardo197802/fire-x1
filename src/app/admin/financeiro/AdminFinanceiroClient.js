"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const dateOnly = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short"
});

function toMoney(value) {
  const numeric = Number(value || 0);
  return money.format(Number.isFinite(numeric) ? numeric : 0);
}

function buildPeriod(days = 30) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  const iso = (value) => value.toISOString().slice(0, 10);
  return {
    de: iso(start),
    ate: iso(end)
  };
}

export default function AdminFinanceiroClient() {
  const [authStage, setAuthStage] = useState("checking");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [twoFactorDestination, setTwoFactorDestination] = useState("");
  const [previewCode, setPreviewCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [userLabel, setUserLabel] = useState("Administrador");
  const [data, setData] = useState({
    resumo: null,
    diario: null,
    usuarios: null,
    caixa: null
  });

  const period = useMemo(() => buildPeriod(30), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const parse = async (response, label) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(`${label}: ${body.error || `HTTP ${response.status}`}`);
      }
      return body;
    };

    try {
      const [resumoRes, diarioRes, usuariosRes, caixaRes] = await Promise.all([
        fetch("/api/admin/financeiro/resumo", { cache: "no-store", credentials: "include" }),
        fetch(`/api/admin/financeiro/diario?de=${period.de}&ate=${period.ate}`, {
          cache: "no-store",
          credentials: "include"
        }),
        fetch("/api/admin/financeiro/usuarios?limite=20", {
          cache: "no-store",
          credentials: "include"
        }),
        fetch(`/api/admin/financeiro/caixa?de=${period.de}&ate=${period.ate}`, {
          cache: "no-store",
          credentials: "include"
        })
      ]);

      const [resumo, diario, usuarios, caixa] = await Promise.all([
        parse(resumoRes, "Resumo"),
        parse(diarioRes, "Diario"),
        parse(usuariosRes, "Usuarios"),
        parse(caixaRes, "Caixa")
      ]);

      setData({ resumo, diario, usuarios, caixa });
      setLastUpdated(new Date().toISOString());
    } catch (requestError) {
      const message = requestError.message || "Falha ao carregar relatorios administrativos.";
      setError(message);
      if (message.includes("HTTP 401") || message.includes("HTTP 403")) {
        setAuthStage("login");
      }
    } finally {
      setLoading(false);
    }
  }, [period.ate, period.de]);

  const checkAdminSession = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/auth/session", {
        method: "GET",
        credentials: "include",
        cache: "no-store"
      });

      if (!response.ok) {
        setAuthStage("login");
        return;
      }

      const body = await response.json().catch(() => ({}));
      setUserLabel(body?.user?.nome || body?.user?.email || "Administrador");
      setAuthStage("ready");
    } catch {
      setAuthStage("login");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAdminSession();
  }, [checkAdminSession]);

  useEffect(() => {
    if (authStage === "ready") {
      loadData();
    }
  }, [authStage, loadData]);

  const onLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ email, senha })
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "Falha ao iniciar login administrativo.");
      }

      setTwoFactorDestination(body.destination || "e-mail de seguranca");
      setPreviewCode(body.previewCode || "");
      setCodigo("");
      setAuthStage("verify");
    } catch (requestError) {
      setError(requestError.message || "Falha ao iniciar login administrativo.");
    } finally {
      setLoading(false);
    }
  };

  const onVerifyCode = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ code: codigo })
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "Falha ao validar código 2FA.");
      }

      setUserLabel(body?.user?.nome || body?.user?.email || "Administrador");
      setAuthStage("ready");
    } catch (requestError) {
      setError(requestError.message || "Falha ao validar código 2FA.");
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    setLoading(true);
    setError("");
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch {
      // Mesmo em caso de erro de rede, limpamos o estado local.
    } finally {
      setAuthStage("login");
      setSenha("");
      setCodigo("");
      setTwoFactorDestination("");
      setPreviewCode("");
      setData({ resumo: null, diario: null, usuarios: null, caixa: null });
      setLoading(false);
    }
  };

  const updatedText = lastUpdated
    ? `${dateOnly.format(new Date(lastUpdated))} ${new Date(lastUpdated).toLocaleTimeString("pt-BR")}`
    : "sem sincronizacao";

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.kicker}>Painel Administrativo</p>
            <h1>Admin Financeiro</h1>
            <p className={styles.subtitle}>Monitoramento de caixa, usuarios e movimentacao.</p>
          </div>
          <div className={styles.topActions}>
            <Link href="/dashboard" className={styles.secondaryBtn}>
              Voltar ao dashboard
            </Link>
            {authStage === "ready" ? (
              <button type="button" className={styles.secondaryBtn} onClick={onLogout} disabled={loading}>
                Encerrar sessao
              </button>
            ) : null}
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={loadData}
              disabled={loading || authStage !== "ready"}
            >
              {loading ? "Atualizando..." : "Atualizar agora"}
            </button>
          </div>
        </header>

        <section className={styles.authPanel}>
          {authStage === "login" ? (
            <form className={styles.form} onSubmit={onLogin}>
              <label htmlFor="admin-email">Acesso administrativo</label>
              <div className={styles.formRow}>
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Seu e-mail administrativo"
                  autoComplete="email"
                  required
                />
                <input
                  id="admin-password"
                  type="password"
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  placeholder="Senha forte"
                  autoComplete="current-password"
                  required
                />
                <button type="submit" className={styles.primaryBtn} disabled={loading}>
                  {loading ? "Validando..." : "Entrar com 2FA"}
                </button>
              </div>
              <p className={styles.authHint}>
                Requisito de senha forte: 12+ caracteres, com maiúsculas, minúsculas, números e símbolo.
              </p>
            </form>
          ) : null}

          {authStage === "verify" ? (
            <form className={styles.form} onSubmit={onVerifyCode}>
              <label htmlFor="admin-2fa">Verificação em 2 fatores</label>
              <div className={styles.formRow}>
                <input
                  id="admin-2fa"
                  type="text"
                  value={codigo}
                  onChange={(event) => setCodigo(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Digite o código de 6 dígitos"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                />
                <button type="submit" className={styles.primaryBtn} disabled={loading}>
                  {loading ? "Conferindo..." : "Validar e abrir painel"}
                </button>
              </div>
              <p className={styles.authHint}>Código enviado para {twoFactorDestination}.</p>
              {previewCode ? <p className={styles.devHint}>Código de desenvolvimento: {previewCode}</p> : null}
            </form>
          ) : null}

          {authStage === "checking" ? <p className={styles.authHint}>Verificando sessão administrativa...</p> : null}

          {authStage === "ready" ? (
            <p className={styles.authReady}>Acesso autorizado. Todos os relatórios foram liberados.</p>
          ) : null}

          <div className={styles.meta}>
            <span>Operador: {userLabel}</span>
            <span>Periodo: {period.de} ate {period.ate}</span>
            <span>Ultima sync: {updatedText}</span>
          </div>
        </section>

        {error ? <p className={styles.errorBox}>{error}</p> : null}

        <section className={styles.summaryGrid}>
          <article className={styles.card}>
            <h3>Entradas</h3>
            <strong>{toMoney(data.resumo?.total_entradas)}</strong>
          </article>
          <article className={styles.card}>
            <h3>Saidas</h3>
            <strong>{toMoney(data.resumo?.total_saidas)}</strong>
          </article>
          <article className={styles.card}>
            <h3>Receita plataforma</h3>
            <strong>{toMoney(data.resumo?.receita_plataforma)}</strong>
          </article>
          <article className={styles.card}>
            <h3>Lucro liquido</h3>
            <strong>{toMoney(data.resumo?.lucro_liquido)}</strong>
          </article>
        </section>

        <section className={styles.panelGrid}>
          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <h2>Relatorio Diario</h2>
              <span>{data.diario?.total_dias || 0} dia(s)</span>
            </div>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Entradas</th>
                    <th>Saidas</th>
                    <th>Total entradas</th>
                    <th>Total saidas</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.diario?.diarios || []).map((row) => (
                    <tr key={row.data}>
                      <td>{row.data}</td>
                      <td>{row.qtd_entradas}</td>
                      <td>{row.qtd_saidas}</td>
                      <td>{toMoney(row.total_entradas)}</td>
                      <td>{toMoney(row.total_saidas)}</td>
                    </tr>
                  ))}
                  {(data.diario?.diarios || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className={styles.empty}>Sem registros no periodo.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <h2>Financeiro por Usuario</h2>
              <span>{data.usuarios?.total_registros || 0} registro(s)</span>
            </div>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.usuarios?.usuarios || []).map((row) => (
                    <tr key={row.user_id}>
                      <td>{row.user_id}</td>
                      <td>{row.nome}</td>
                      <td>{row.email}</td>
                      <td>{toMoney(row.saldo)}</td>
                    </tr>
                  ))}
                  {(data.usuarios?.usuarios || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className={styles.empty}>Sem usuarios para exibir.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <h2>Caixa da Plataforma</h2>
              <span>Saldo: {toMoney(data.caixa?.resumo?.saldo_caixa)}</span>
            </div>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Entradas</th>
                    <th>Saidas</th>
                    <th>Total entradas</th>
                    <th>Total saidas</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.caixa?.diarios || []).map((row) => (
                    <tr key={`caixa-${row.data}`}>
                      <td>{row.data}</td>
                      <td>{row.qtd_entradas}</td>
                      <td>{row.qtd_saidas}</td>
                      <td>{toMoney(row.total_entradas)}</td>
                      <td>{toMoney(row.total_saidas)}</td>
                    </tr>
                  ))}
                  {(data.caixa?.diarios || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className={styles.empty}>Sem movimentacao de caixa no periodo.</td>
                    </tr>
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
