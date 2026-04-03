"use client";

import { useEffect, useState } from "react";
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
        const response = await fetch(`/user/dashboard/${parsedUser.id}`);
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

  const userName = state.user?.nome || "Jogador";
  const firstName = userName.split(" ")[0];
  const saldoDisponivel = currencyFormatter.format(state.metrics?.saldoDisponivel || 0);
  const contaVerificada = Boolean(state.metrics?.contaVerificada);
  const contaLiberada = Boolean(state.metrics?.contaLiberada);
  const securityTitle = contaVerificada ? "Conta protegida e validada" : "Segurança da conta requer atenção";
  const securityText = contaVerificada
    ? "Seu cadastro está validado. O ambiente já pode priorizar operação, disputas e fluxo financeiro com menos atrito."
    : "Finalize a verificação para liberar todos os recursos e deixar seu painel com status operacional completo.";

  const metricas = [
    {
      rotulo: "Saldo atual",
      valor: saldoDisponivel,
      detalhe: state.user ? `Conta criada em ${formatDate(state.user.criadoEm)}` : "Sincronizando dados"
    },
    {
      rotulo: "Status da conta",
      valor: contaLiberada ? "Ativa" : "Em análise",
      detalhe: contaLiberada ? "Recursos principais habilitados" : "Liberação ainda pendente"
    },
    {
      rotulo: "Verificação",
      valor: contaVerificada ? "Concluída" : "Pendente",
      detalhe: contaVerificada ? "Cadastro validado" : "Ação recomendada"
    },
    {
      rotulo: "Canal principal",
      valor: (state.user?.canalVerificacao || "email").toUpperCase(),
      detalhe: "Canal de comunicação da conta"
    }
  ];

  const quickActions = [
    { title: "Meus dados", text: "Revise suas informações principais.", accent: false },
    { title: "Segurança", text: "Acompanhe verificação e proteção.", accent: true },
    { title: "Adicionar crédito", text: "Prepare saldo para novas disputas.", accent: true },
    { title: "Ver desafios", text: "Acesse oportunidades ativas.", accent: false }
  ];

  const accountRows = [
    { label: "Nome da conta", value: userName, tag: "Conta" },
    { label: "E-mail principal", value: state.user?.email || "-", tag: "Login" },
    { label: "Status de verificação", value: contaVerificada ? "Concluído" : "Pendente", tag: contaVerificada ? "OK" : "Ação" },
    { label: "Liberação operacional", value: contaLiberada ? "Conta apta para operar" : "Aguardando liberação", tag: contaLiberada ? "Online" : "Em análise" }
  ];

  const logout = () => {
    window.localStorage.removeItem("firex1:user");
    window.location.href = "/";
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
              <div className={styles.userPill}>
                <span className={styles.userPillLabel}>Usuário</span>
                <strong>{firstName}</strong>
              </div>
              <button type="button" className={styles.secondaryButton} onClick={logout}>Sair</button>
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
                    <button className={styles.secondaryButton}>Ver desafios</button>
                  </div>
                </div>

                <div className={styles.balanceCard}>
                  <p className={styles.balanceLabel}>Saldo disponível</p>
                  <strong className={styles.balanceValue}>{saldoDisponivel}</strong>
                  <span className={styles.balanceMeta}>
                    {contaLiberada ? "Conta pronta para operar" : "Conta aguardando liberação completa"}
                  </span>
                  <div className={styles.balanceMiniGrid}>
                    <div>
                      <span>Status</span>
                      <strong>{contaVerificada ? "Verificada" : "Pendente"}</strong>
                    </div>
                    <div>
                      <span>Canal</span>
                      <strong>{state.user?.canalVerificacao || "email"}</strong>
                    </div>
                  </div>
                </div>
              </section>

              <section className={styles.metricGrid}>
                {metricas.map((item) => (
                  <article key={item.rotulo} className={styles.metricCard}>
                    <p>{item.rotulo}</p>
                    <strong>{item.valor}</strong>
                    <span>{item.detalhe}</span>
                  </article>
                ))}
              </section>

              <section className={styles.actionGrid}>
                {quickActions.map((action) => (
                  <article
                    key={action.title}
                    className={`${styles.actionCard} ${action.accent ? styles.actionCardAccent : ""}`}
                  >
                    <p className={styles.actionTitle}>{action.title}</p>
                    <span>{action.text}</span>
                  </article>
                ))}
              </section>

              <section className={styles.board}>
                <article className={styles.panelLarge}>
                  <div className={styles.panelHeader}>
                    <div>
                      <p className={styles.kicker}>Centro de segurança</p>
                      <h3>{securityTitle}</h3>
                    </div>
                    <span className={`${styles.statusBadge} ${contaVerificada ? styles.statusBadgeGood : styles.statusBadgeWarn}`}>
                      {contaVerificada ? "Proteção validada" : "Exige atenção"}
                    </span>
                  </div>

                  <div className={styles.securityIntro}>
                    <p>{securityText}</p>
                    <button className={styles.primaryButton}>Abrir segurança da conta</button>
                  </div>

                  <div className={styles.accountList}>
                    {accountRows.map((item) => (
                      <div key={item.label} className={styles.accountRow}>
                        <div>
                          <p className={styles.accountLabel}>{item.label}</p>
                          <strong className={styles.accountValue}>{item.value}</strong>
                        </div>
                        <span className={styles.accountTag}>{item.tag}</span>
                      </div>
                    ))}
                  </div>
                </article>

                <article className={styles.panelSide}>
                  <div className={styles.profileCard}>
                    <div className={styles.profileHead}>
                      <div className={styles.avatarRing}>{firstName.slice(0, 1).toUpperCase()}</div>
                      <div>
                        <p className={styles.kicker}>Perfil da conta</p>
                        <h3>{userName}</h3>
                        <span>{state.user?.email}</span>
                      </div>
                    </div>

                    <div className={styles.walletStats}>
                      <div>
                        <strong>{state.user?.id || "-"}</strong>
                        <p>ID interno</p>
                      </div>
                      <div>
                        <strong>{formatDate(state.user?.criadoEm)}</strong>
                        <p>Abertura</p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.timeline}>
                    <div className={styles.panelHeader}>
                      <div>
                        <p className={styles.kicker}>Atividade recente</p>
                        <h3>Atualizações da conta</h3>
                      </div>
                    </div>

                    {state.activity.map((atividade) => (
                      <div key={`${atividade.titulo}-${atividade.tempo}`} className={styles.timelineItem}>
                        <div className={styles.timelineDot} />
                        <div>
                          <strong>{atividade.titulo}</strong>
                          <p>{atividade.meta}</p>
                        </div>
                        <span>{atividade.tempo}</span>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}