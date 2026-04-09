"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium"
  }).format(date);
};

export default function DashboardClient() {
  const userMenuRef = useRef(null);
  const openTimerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const [state, setState] = useState({
    loading: true,
    error: "",
    user: null,
    metrics: null,
    activity: []
  });

  useEffect(() => {
    const rawUser = window.localStorage.getItem("firex1:user");

    if (!rawUser) {
      setState({
        loading: false,
        error: "Nenhum usuário logado encontrado. Faça login novamente.",
        user: null,
        metrics: null,
        activity: []
      });
      return;
    }

    let parsedUser;

    try {
      parsedUser = JSON.parse(rawUser);
    } catch {
      setState({
        loading: false,
        error: "Sessão local inválida. Faça login novamente.",
        user: null,
        metrics: null,
        activity: []
      });
      return;
    }

    if (!parsedUser?.id) {
      setState({
        loading: false,
        error: "Sessão incompleta. Faça login novamente.",
        user: null,
        metrics: null,
        activity: []
      });
      return;
    }

    const loadDashboard = async () => {
      try {
        const response = await fetch(`/api/user/dashboard/${parsedUser.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Erro ao carregar dashboard.");
        }

        setState({
          loading: false,
          error: "",
          user: data.user,
          metrics: data.metrics,
          activity: data.activity || []
        });
      } catch (error) {
        setState({
          loading: false,
          error: error.message,
          user: null,
          metrics: null,
          activity: []
        });
      }
    };

    loadDashboard();
  }, []);

  useEffect(() => {
    return () => {
      if (openTimerRef.current) {
        window.clearTimeout(openTimerRef.current);
      }

      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!userMenuRef.current?.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const userName = state.user?.nome || "Jogador";
  const firstName = userName.split(" ")[0];
  const saldoDisponivel = currencyFormatter.format(state.metrics?.saldoDisponivel || 0);
  const contaLiberada = Boolean(state.metrics?.contaLiberada);
  const extrato = state.metrics?.extrato || {};
  const totalGanho = Number(extrato.totalGanho || 0);
  const totalPerdido = Number(extrato.totalPerdido || 0);
  const jogosDisputados = Number(extrato.jogosDisputados || 0);
  const vitorias = Number(extrato.vitorias || 0);
  const derrotas = Number(extrato.derrotas || 0);
  const maiorApostaGanha = Number(extrato.maiorApostaGanha || 0);
  const maiorApostaPerdida = Number(extrato.maiorApostaPerdida || 0);
  const resultadoLiquido = Number(extrato.resultadoLiquido || totalGanho - totalPerdido);
  const taxaVitoria = Number(extrato.taxaVitoria || 0);
  const temDadosDesempenho = totalGanho > 0 || totalPerdido > 0;
  const chartMax = Math.max(totalGanho, totalPerdido, 1);
  const ganhoBarHeight = temDadosDesempenho ? Math.max(12, Math.round((totalGanho / chartMax) * 100)) : 8;
  const perdaBarHeight = temDadosDesempenho ? Math.max(12, Math.round((totalPerdido / chartMax) * 100)) : 8;

  const extratoCards = [
    {
      rotulo: "Total ganho",
      valor: currencyFormatter.format(totalGanho),
      detalhe: "Soma de premiações nas vitórias"
    },
    {
      rotulo: "Total perdido",
      valor: currencyFormatter.format(totalPerdido),
      detalhe: "Soma dos valores das derrotas"
    },
    {
      rotulo: "Resultado líquido",
      valor: currencyFormatter.format(resultadoLiquido),
      detalhe: resultadoLiquido >= 0 ? "Operação positiva" : "Operação negativa"
    },
    {
      rotulo: "Jogos disputados",
      valor: String(jogosDisputados),
      detalhe: `${vitorias} vitória(s) e ${derrotas} derrota(s)`
    },
    {
      rotulo: "Taxa de vitória",
      valor: `${taxaVitoria.toFixed(1)}%`,
      detalhe: "Aproveitamento nas disputas"
    },
    {
      rotulo: "Maior aposta ganha",
      valor: currencyFormatter.format(maiorApostaGanha),
      detalhe: "Maior retorno em uma disputa"
    },
    {
      rotulo: "Maior aposta perdida",
      valor: currencyFormatter.format(maiorApostaPerdida),
      detalhe: "Maior perda em uma disputa"
    }
  ];

  const logout = () => {
    window.localStorage.removeItem("firex1:user");
    window.location.href = "/";
  };

  const clearMenuTimers = () => {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }

    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openMenuWithDelay = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (isUserMenuOpen) {
      return;
    }

    if (!openTimerRef.current) {
      openTimerRef.current = window.setTimeout(() => {
        setIsUserMenuOpen(true);
        openTimerRef.current = null;
      }, 170);
    }
  };

  const closeMenuWithDelay = () => {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }

    if (!closeTimerRef.current) {
      closeTimerRef.current = window.setTimeout(() => {
        setIsUserMenuOpen(false);
        closeTimerRef.current = null;
      }, 210);
    }
  };

  const toggleMenuByClick = () => {
    clearMenuTimers();
    setIsUserMenuOpen((prev) => !prev);
  };

  const closeMenuNow = () => {
    clearMenuTimers();
    setIsUserMenuOpen(false);
  };

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <div className={styles.content}>
          <header className={styles.topbar}>
            <div className={styles.brandBlock}>
              <div className={styles.brandBadge}>FX1</div>
              <div>
                <p className={styles.kicker}>Painel premium</p>
                <h1 className={styles.brandTitle}>Fire X1 Dashboard</h1>
              </div>
            </div>

            <div className={styles.topbarActions}>
              <div
                className={styles.userMenu}
                ref={userMenuRef}
                onMouseEnter={openMenuWithDelay}
                onMouseLeave={closeMenuWithDelay}
              >
                <button
                  type="button"
                  className={styles.userMenuTrigger}
                  aria-haspopup="true"
                  aria-expanded={isUserMenuOpen}
                  onClick={toggleMenuByClick}
                >
                  <span className={styles.userMenuLabel}>Conta</span>
                  <span className={styles.userMenuBalance}>{saldoDisponivel}</span>
                  <strong>{userName.toUpperCase()}</strong>
                  <span
                    className={`${styles.userMenuChevron} ${isUserMenuOpen ? styles.userMenuChevronOpen : ""}`}
                    aria-hidden="true"
                  >
                    ▾
                  </span>
                </button>

                <div className={`${styles.userDropdown} ${isUserMenuOpen ? styles.userDropdownOpen : ""}`}>
                  <Link href="/conta/meu-perfil" className={styles.userDropdownItem} onClick={closeMenuNow}>Meu perfil</Link>
                  <Link href="/conta/adicionar-fundo" className={styles.userDropdownItem} onClick={closeMenuNow}>Adicionar fundo</Link>
                  <Link href="/conta/minha-fatura" className={styles.userDropdownItem} onClick={closeMenuNow}>Minha fatura</Link>
                  <Link href="/conta/assinatura" className={styles.userDropdownItem} onClick={closeMenuNow}>Assinatura</Link>

                  <div className={styles.userDropdownMeta}>
                    <p>Conta criada</p>
                    <span>{formatDate(state.user?.criadoEm)}</span>
                    <p>{state.user?.email || "-"}</p>
                  </div>

                  <button
                    type="button"
                    className={styles.userDropdownLogout}
                    onClick={() => {
                      closeMenuNow();
                      logout();
                    }}
                  >
                    Sair
                  </button>
                </div>
              </div>
            </div>
          </header>

          {state.loading ? <section className={styles.infoState}>Carregando dashboard...</section> : null}
          {state.error ? <section className={styles.errorState}>{state.error}</section> : null}

          {!state.loading && !state.error ? (
            <>
              <section className={styles.heroPanel}>
                <div className={styles.heroCopy}>
                  <p className={styles.kicker}>Visão principal</p>
                  <h2 className={styles.heroTitle}>Bem-vindo, {firstName}. Agora a experiência está com cara de produto.</h2>
                  <p className={styles.heroText}>
                    Saldo, status da conta, segurança e ações rápidas em uma interface mais limpa, moderna e profissional.
                  </p>

                  <div className={styles.heroActions}>
                    <button className={styles.primaryButton}>Adicionar crédito</button>
                    <button className={styles.secondaryButton}>Criar desafios</button>
                    <button className={styles.secondaryButton}>Ver desafios</button>
                  </div>
                </div>

                <div className={styles.balanceCard}>
                  <div className={styles.performanceChart}>
                    <p className={styles.performanceTitle}>Gráfico de desempenho</p>

                    <div className={styles.barChart}>
                      <div className={styles.barColumn}>
                        <div className={styles.barTrack}>
                          <div
                            className={`${styles.barFill} ${styles.barGain}`}
                            style={{ height: `${ganhoBarHeight}%` }}
                          />
                        </div>
                        <span>Ganhos</span>
                        <strong>{currencyFormatter.format(totalGanho)}</strong>
                      </div>

                      <div className={styles.barColumn}>
                        <div className={styles.barTrack}>
                          <div
                            className={`${styles.barFill} ${styles.barLoss}`}
                            style={{ height: `${perdaBarHeight}%` }}
                          />
                        </div>
                        <span>Perdas</span>
                        <strong>{currencyFormatter.format(totalPerdido)}</strong>
                      </div>
                    </div>

                    <div className={styles.performanceLegend}>
                      <div>
                        <i className={styles.legendDotGain} />
                        <span>Ganhos</span>
                      </div>
                      <div>
                        <i className={styles.legendDotLoss} />
                        <span>Perdas</span>
                      </div>
                    </div>

                    <div className={styles.performanceFooter}>
                      <span>{jogosDisputados} jogo(s)</span>
                      <strong>{resultadoLiquido >= 0 ? "Resultado positivo" : "Resultado negativo"}</strong>
                    </div>
                  </div>
                </div>
              </section>

              <section className={styles.statementSection}>
                <div className={styles.statementHeader}>
                  <p className={styles.kicker}>Extrato de desempenho</p>
                  <h3>Ganhos, perdas e performance das suas apostas</h3>
                </div>

                <div className={styles.statementGrid}>
                  {extratoCards.map((card) => (
                    <article key={card.rotulo} className={styles.statementCard}>
                      <p>{card.rotulo}</p>
                      <strong>{card.valor}</strong>
                      <span>{card.detalhe}</span>
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}