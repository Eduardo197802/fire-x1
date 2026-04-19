"use client";

import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";

const PIX_QR_TTL_MS = 5 * 60 * 1000;
const PIX_STATUS_POLL_INTERVAL_MS = 4000;

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium"
  }).format(date);
};

const maskCpf = (value) => {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length !== 11) return "-";
  return `***.***.***-${digits.slice(9)}`;
};

const formatPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length !== 11) return value || "-";
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const splitName = (fullName) => {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return { firstName: "", lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ")
  };
};

const extractUsername = (email, fullName) => {
  const normalizedEmail = String(email || "").trim();

  if (normalizedEmail.includes("@")) {
    return normalizedEmail.split("@")[0];
  }

  return String(fullName || "").trim().toLowerCase().replace(/\s+/g, ".");
};

const initialForm = {
  username: "",
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  cpf: "",
  birthDate: "",
  whatsapp: "",
  address1: "",
  address2: "",
  country: "Brasil",
  state: "",
  city: "",
  postalCode: "",
  language: "Português",
  newsletter: true
};

const initialPasswordForm = {
  senhaAtual: "",
  novaSenha: "",
  confirmarNovaSenha: ""
};

const parseAmountInput = (value) => {
  const normalized = String(value || "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return 0;
  return Number(amount.toFixed(2));
};

const formatCountdown = (timeLeftMs) => {
  const totalSeconds = Math.max(0, Math.ceil(timeLeftMs / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const resolveSessionUserId = () => {
  if (typeof window === "undefined") return null;

  try {
    const rawUser = window.localStorage.getItem("firex1:user");
    if (!rawUser) return null;

    const parsedUser = JSON.parse(rawUser);
    const id = Number(parsedUser?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
};

const resolveDepositQrImage = async (data) => {
  const providedImage = data?.qrCodeImagem || data?.imagem || null;

  if (providedImage) {
    return providedImage;
  }

  const brCode = String(data?.brCode || "").trim();

  if (!brCode) {
    return null;
  }

  return QRCode.toDataURL(brCode, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320
  });
};

export default function ContaPageClient({ pageKey, page }) {
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState("editar-perfil");

  const [state, setState] = useState({
    loading: pageKey === "meu-perfil",
    error: "",
    profile: null
  });

  const [form, setForm] = useState(initialForm);
  const [saveMessage, setSaveMessage] = useState("");

  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [securityChannel, setSecurityChannel] = useState("email");
  const [securityMessage, setSecurityMessage] = useState("");
  const [securityError, setSecurityError] = useState("");

  const [twoFactorEmail, setTwoFactorEmail] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoStepMessage, setTwoStepMessage] = useState("");
  const [twoStepError, setTwoStepError] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [depositValue, setDepositValue] = useState("20,00");
  const [depositData, setDepositData] = useState(null);
  const [depositQrImage, setDepositQrImage] = useState("");
  const [depositError, setDepositError] = useState("");
  const [depositMessage, setDepositMessage] = useState("");
  const [depositDeadlineAt, setDepositDeadlineAt] = useState(0);
  const [depositCountdownLabel, setDepositCountdownLabel] = useState("05:00");
  const [depositMonitoring, setDepositMonitoring] = useState(false);
  const depositRedirectedRef = useRef(false);

  const redirectToDashboard = (reason) => {
    if (typeof window === "undefined" || depositRedirectedRef.current) {
      return;
    }

    depositRedirectedRef.current = true;
    window.location.assign(`/dashboard?pix=${encodeURIComponent(reason)}&t=${Date.now()}`);
  };

  useEffect(() => {
    const sessionUserId = resolveSessionUserId();
    if (sessionUserId) {
      setUserId(sessionUserId);
    }

    if (pageKey !== "meu-perfil") {
      return;
    }

    const rawUser = window.localStorage.getItem("firex1:user");

    if (!rawUser) {
      setState({
        loading: false,
        error: "Sessão não encontrada. Faça login novamente.",
        profile: null
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
        profile: null
      });
      return;
    }

    if (!parsedUser?.id) {
      setState({
        loading: false,
        error: "Sessão incompleta. Faça login novamente.",
        profile: null
      });
      return;
    }

    setUserId(parsedUser.id);

    const loadProfile = async () => {
      try {
        const response = await fetch(`/api/user/perfil/${parsedUser.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Não foi possível carregar os dados do perfil.");
        }

        setState({
          loading: false,
          error: "",
          profile: data
        });

        const nameParts = splitName(data.nome);

        setForm((prev) => ({
          ...prev,
          username: extractUsername(data.email, data.nome),
          email: data.email || "",
          firstName: nameParts.firstName,
          lastName: nameParts.lastName,
          phone: formatPhone(data.celular),
          cpf: maskCpf(data.cpf),
          birthDate: data.dataNascimento || "",
          whatsapp: formatPhone(data.celular),
          country: "Brasil"
        }));

        setSecurityChannel((data.canalVerificacao || "email").toLowerCase());
        setTwoFactorEmail(data.twoFactorDestination || data.email || "");
      } catch (error) {
        setState({
          loading: false,
          error: error.message,
          profile: null
        });
      }
    };

    loadProfile();
  }, [pageKey]);

  useEffect(() => {
    if (pageKey !== "adicionar-fundo" || !depositData?.txid || !depositDeadlineAt) {
      return;
    }

    const sessionUserId = Number(userId || resolveSessionUserId());
    if (!sessionUserId) {
      setDepositError("Sessão inválida para acompanhar o depósito PIX.");
      return;
    }

    let cancelled = false;

    const tickCountdown = () => {
      const remainingMs = depositDeadlineAt - Date.now();

      if (remainingMs <= 0) {
        setDepositCountdownLabel("00:00");
        setDepositMonitoring(false);
        setDepositMessage("Tempo do QR Code encerrado. Você será redirecionado ao dashboard.");
        redirectToDashboard("expirado");
        return false;
      }

      setDepositCountdownLabel(formatCountdown(remainingMs));
      return true;
    };

    const pollStatus = async () => {
      if (cancelled || depositRedirectedRef.current) {
        return;
      }

      const remainingMs = depositDeadlineAt - Date.now();
      if (remainingMs <= 0) {
        return;
      }

      try {
        const query = new URLSearchParams({
          userId: String(sessionUserId),
          txid: String(depositData.txid)
        });

        const response = await fetch(`/api/pix/status?${query.toString()}`, {
          cache: "no-store"
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setDepositError(data.error || "Sessão inválida. Faça login novamente.");
            redirectToDashboard("sessao-invalida");
          }
          return;
        }

        if (data?.isPaid) {
          setDepositMonitoring(false);
          setDepositError("");
          setDepositMessage("Pagamento confirmado. Redirecionando ao dashboard com saldo atualizado...");
          redirectToDashboard("creditado");
        }
      } catch {
        // Mantem monitoramento ativo mesmo com falhas momentaneas de rede.
      }
    };

    setDepositMonitoring(true);

    const shouldContinue = tickCountdown();
    if (shouldContinue) {
      pollStatus();
    }

    const countdownInterval = window.setInterval(() => {
      const keepRunning = tickCountdown();
      if (!keepRunning) {
        window.clearInterval(countdownInterval);
        window.clearInterval(pollInterval);
      }
    }, 1000);

    const pollInterval = window.setInterval(() => {
      pollStatus();
    }, PIX_STATUS_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(countdownInterval);
      window.clearInterval(pollInterval);
    };
  }, [pageKey, depositData, depositDeadlineAt, userId]);

  const accountMeta = useMemo(() => {
    if (!state.profile) {
      return [];
    }

    return [
      { label: "Conta criada em", value: formatDate(state.profile.criadoEm) },
      {
        label: "Canal de verificação",
        value: (state.profile.canalVerificacao || "email").toUpperCase()
      },
      { label: "Conta verificada", value: state.profile.contaVerificada ? "Sim" : "Não" },
      { label: "Conta liberada", value: state.profile.contaLiberada ? "Sim" : "Não" }
    ];
  }, [state.profile]);

  const onFieldChange = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaveMessage("");
  };

  const onSaveProfile = (event) => {
    event.preventDefault();
    setSaveMessage("Perfil atualizado neste ambiente. Se quiser, eu também conecto o salvar no banco.");
  };

  const onPasswordFieldChange = (field) => (event) => {
    setPasswordForm((prev) => ({ ...prev, [field]: event.target.value }));
    setPasswordMessage("");
    setPasswordError("");
  };

  const onSavePassword = async (event) => {
    event.preventDefault();

    if (!userId) {
      setPasswordError("Sessão inválida. Faça login novamente.");
      return;
    }

    if (!passwordForm.senhaAtual || !passwordForm.novaSenha || !passwordForm.confirmarNovaSenha) {
      setPasswordError("Preencha todos os campos para alterar a senha.");
      return;
    }

    if (passwordForm.novaSenha.length < 8) {
      setPasswordError("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }

    if (passwordForm.novaSenha !== passwordForm.confirmarNovaSenha) {
      setPasswordError("A confirmação da nova senha não confere.");
      return;
    }

    try {
      setActionLoading(true);
      setPasswordError("");

      const response = await fetch("/api/user/alterar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          senhaAtual: passwordForm.senhaAtual,
          novaSenha: passwordForm.novaSenha
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível alterar a senha.");
      }

      setPasswordMessage(data.message || "Senha atualizada com sucesso.");
      setPasswordForm(initialPasswordForm);
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const onSaveSecurity = async (event) => {
    event.preventDefault();

    if (!userId) {
      setSecurityError("Sessão inválida. Faça login novamente.");
      return;
    }

    try {
      setActionLoading(true);
      setSecurityError("");

      const response = await fetch("/api/user/seguranca/acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          canalVerificacao: securityChannel
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível salvar as configurações de segurança.");
      }

      setSecurityMessage(data.message || "Configurações de segurança salvas.");
      setState((prev) => ({
        ...prev,
        profile: prev.profile
          ? { ...prev.profile, canalVerificacao: securityChannel }
          : prev.profile
      }));
    } catch (error) {
      setSecurityError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const onRegisterTwoFactor = async (event) => {
    event.preventDefault();

    if (!userId) {
      setTwoStepError("Sessão inválida. Faça login novamente.");
      return;
    }

    try {
      setActionLoading(true);
      setTwoStepError("");
      setTwoStepMessage("");

      const response = await fetch("/api/user/2fa/cadastrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          destination: twoFactorEmail
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível cadastrar a verificação em 2 etapas.");
      }

      setTwoStepMessage("Código enviado. Digite o código recebido para ativar a verificação em 2 etapas.");
      setState((prev) => ({
        ...prev,
        profile: prev.profile
          ? {
              ...prev.profile,
              twoFactorDestination: data.destination,
              twoFactorPending: true,
              twoFactorEnabled: false
            }
          : prev.profile
      }));
    } catch (error) {
      setTwoStepError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const onActivateTwoFactor = async (event) => {
    event.preventDefault();

    if (!userId) {
      setTwoStepError("Sessão inválida. Faça login novamente.");
      return;
    }

    if (String(twoFactorCode).replace(/\D/g, "").length !== 6) {
      setTwoStepError("Informe um código de 6 dígitos para ativar.");
      return;
    }

    try {
      setActionLoading(true);
      setTwoStepError("");
      setTwoStepMessage("");

      const response = await fetch("/api/user/2fa/ativar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code: twoFactorCode })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível ativar a verificação em 2 etapas.");
      }

      setTwoFactorCode("");
      setTwoStepMessage(data.message || "Verificação em 2 etapas ativada.");
      setState((prev) => ({
        ...prev,
        profile: prev.profile
          ? {
              ...prev.profile,
              twoFactorEnabled: true,
              twoFactorPending: false,
              twoFactorDestination: data.destination || prev.profile.twoFactorDestination
            }
          : prev.profile
      }));
    } catch (error) {
      setTwoStepError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const onDisableTwoFactor = async () => {
    if (!userId) {
      setTwoStepError("Sessão inválida. Faça login novamente.");
      return;
    }

    try {
      setActionLoading(true);
      setTwoStepError("");
      setTwoStepMessage("");

      const response = await fetch("/api/user/2fa/desativar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível desativar a verificação em 2 etapas.");
      }

      setTwoStepMessage(data.message || "Verificação em 2 etapas desativada.");
      setState((prev) => ({
        ...prev,
        profile: prev.profile
          ? {
              ...prev.profile,
              twoFactorEnabled: false,
              twoFactorPending: false
            }
          : prev.profile
      }));
    } catch (error) {
      setTwoStepError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const renderTwoStepPanel = () => {
    const isEnabled = Boolean(state.profile?.twoFactorEnabled);
    const isPending = Boolean(state.profile?.twoFactorPending);
    const destination = state.profile?.twoFactorDestination;

    if (isEnabled) {
      return (
        <div className={styles.tabPanelForm}>
          <p className={styles.tabHelper}>A verificação em 2 etapas está ativa.</p>
          <p className={styles.tabHelper}>Canal cadastrado: {destination || "e-mail principal"}.</p>

          <div className={styles.actionsRow}>
            <button type="button" className={styles.primaryButton} onClick={onDisableTwoFactor} disabled={actionLoading}>
              Desativar verificação
            </button>
          </div>

          {twoStepError ? <p className={styles.errorMessage}>{twoStepError}</p> : null}
          {twoStepMessage ? <p className={styles.successMessage}>{twoStepMessage}</p> : null}
        </div>
      );
    }

    if (!destination || !isPending) {
      return (
        <form className={styles.tabPanelForm} onSubmit={onRegisterTwoFactor}>
          <p className={styles.tabHelper}>
            Cadastre um e-mail para ativar a verificação em 2 etapas da sua conta.
          </p>

          <label className={styles.fieldGroup}>
            <span>E-mail para verificação em 2 etapas</span>
            <input
              type="email"
              value={twoFactorEmail}
              onChange={(event) => {
                setTwoFactorEmail(event.target.value);
                setTwoStepError("");
                setTwoStepMessage("");
              }}
              placeholder="seuemail@dominio.com"
            />
          </label>

          <div className={styles.actionsRow}>
            <button type="submit" className={styles.primaryButton} disabled={actionLoading}>Cadastrar verificação</button>
          </div>

          {twoStepError ? <p className={styles.errorMessage}>{twoStepError}</p> : null}
          {twoStepMessage ? <p className={styles.successMessage}>{twoStepMessage}</p> : null}
        </form>
      );
    }

    return (
      <form className={styles.tabPanelForm} onSubmit={onActivateTwoFactor}>
        <p className={styles.tabHelper}>Cadastro em andamento para: {destination}.</p>
        <p className={styles.tabHelper}>Digite o código recebido no e-mail para concluir a ativação.</p>

        <label className={styles.fieldGroup}>
          <span>Código de verificação</span>
          <input
            value={twoFactorCode}
            onChange={(event) => {
              setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6));
              setTwoStepError("");
              setTwoStepMessage("");
            }}
            placeholder="000000"
            inputMode="numeric"
          />
        </label>

        <div className={styles.actionsRow}>
          <button type="submit" className={styles.primaryButton} disabled={actionLoading}>Ativar verificação</button>
          <button type="button" className={styles.secondaryLink} onClick={onRegisterTwoFactor} disabled={actionLoading}>
            Reenviar código
          </button>
        </div>

        {twoStepError ? <p className={styles.errorMessage}>{twoStepError}</p> : null}
        {twoStepMessage ? <p className={styles.successMessage}>{twoStepMessage}</p> : null}
      </form>
    );
  };

  const renderTabContent = () => {
    if (activeTab === "editar-perfil") {
      return (
        <>
          <form className={styles.profileForm} onSubmit={onSaveProfile}>
            <div className={styles.profileGrid}>
              <label className={styles.fieldGroup}>
                <span>Nome de usuário</span>
                <input value={form.username} onChange={onFieldChange("username")} />
              </label>

              <label className={styles.fieldGroup}>
                <span>E-mail</span>
                <input value={form.email} onChange={onFieldChange("email")} />
              </label>

              <label className={styles.fieldGroup}>
                <span>WhatsApp</span>
                <input value={form.whatsapp} onChange={onFieldChange("whatsapp")} placeholder="(00) 00000-0000" />
              </label>

              <label className={styles.fieldGroup}>
                <span>Nome</span>
                <input value={form.firstName} onChange={onFieldChange("firstName")} />
              </label>

              <label className={styles.fieldGroup}>
                <span>Sobrenome</span>
                <input value={form.lastName} onChange={onFieldChange("lastName")} />
              </label>

              <label className={styles.fieldGroup}>
                <span>Contato</span>
                <input value={form.phone} onChange={onFieldChange("phone")} placeholder="(00) 00000-0000" />
              </label>

              <label className={`${styles.fieldGroup} ${styles.fieldGroupWide}`}>
                <span>Endereço 1</span>
                <input value={form.address1} onChange={onFieldChange("address1")} />
              </label>

              <label className={styles.fieldGroup}>
                <span>CPF</span>
                <input value={form.cpf} readOnly aria-label="CPF oculto" />
              </label>

              <label className={`${styles.fieldGroup} ${styles.fieldGroupWide}`}>
                <span>Endereço 2</span>
                <input value={form.address2} onChange={onFieldChange("address2")} />
              </label>

              <label className={styles.fieldGroup}>
                <span>Data de nascimento</span>
                <input type="date" value={form.birthDate} onChange={onFieldChange("birthDate")} />
              </label>

              <label className={styles.fieldGroup}>
                <span>País</span>
                <input value={form.country} onChange={onFieldChange("country")} />
              </label>

              <label className={styles.fieldGroup}>
                <span>Língua</span>
                <input value={form.language} onChange={onFieldChange("language")} />
              </label>

              <label className={styles.fieldGroup}>
                <span>Estado</span>
                <input value={form.state} onChange={onFieldChange("state")} />
              </label>

              <label className={styles.fieldGroup}>
                <span>Cidade</span>
                <input value={form.city} onChange={onFieldChange("city")} />
              </label>

              <label className={styles.fieldGroup}>
                <span>CEP / Código postal</span>
                <input value={form.postalCode} onChange={onFieldChange("postalCode")} />
              </label>
            </div>

            <label className={styles.checkboxRow}>
              <input type="checkbox" checked={form.newsletter} onChange={onFieldChange("newsletter")} />
              <span>Assinar newsletter</span>
            </label>

            {saveMessage ? <p className={styles.successMessage}>{saveMessage}</p> : null}

            <div className={styles.actionsRow}>
              <button type="submit" className={styles.primaryButton}>Salvar</button>
              <Link href="/dashboard" className={styles.secondaryLink}>Voltar ao dashboard</Link>
            </div>
          </form>

          <div className={styles.metaGrid}>
            {accountMeta.map((item) => (
              <article key={item.label} className={styles.metaItem}>
                <p>{item.label}</p>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </>
      );
    }

    if (activeTab === "mudar-senha") {
      return (
        <form className={styles.tabPanelForm} onSubmit={onSavePassword}>
          <p className={styles.tabHelper}>Atualize sua senha usando a senha atual da conta.</p>

          <label className={styles.fieldGroup}>
            <span>Senha atual</span>
            <input type="password" value={passwordForm.senhaAtual} onChange={onPasswordFieldChange("senhaAtual")} />
          </label>

          <label className={styles.fieldGroup}>
            <span>Nova senha</span>
            <input type="password" value={passwordForm.novaSenha} onChange={onPasswordFieldChange("novaSenha")} />
          </label>

          <label className={styles.fieldGroup}>
            <span>Confirmar nova senha</span>
            <input
              type="password"
              value={passwordForm.confirmarNovaSenha}
              onChange={onPasswordFieldChange("confirmarNovaSenha")}
            />
          </label>

          {passwordError ? <p className={styles.errorMessage}>{passwordError}</p> : null}
          {passwordMessage ? <p className={styles.successMessage}>{passwordMessage}</p> : null}

          <div className={styles.actionsRow}>
            <button type="submit" className={styles.primaryButton} disabled={actionLoading}>Salvar nova senha</button>
          </div>
        </form>
      );
    }

    if (activeTab === "seguranca-acesso") {
      return (
        <form className={styles.tabPanelForm} onSubmit={onSaveSecurity}>
          <p className={styles.tabHelper}>
            Defina o canal principal para alertas de segurança e validações sensíveis.
          </p>

          <label className={styles.fieldGroup}>
            <span>Canal principal de segurança</span>
            <select
              className={styles.fieldSelect}
              value={securityChannel}
              onChange={(event) => {
                setSecurityChannel(event.target.value);
                setSecurityMessage("");
                setSecurityError("");
              }}
            >
              <option value="email">E-mail</option>
            </select>
          </label>

          {securityError ? <p className={styles.errorMessage}>{securityError}</p> : null}
          {securityMessage ? <p className={styles.successMessage}>{securityMessage}</p> : null}

          <div className={styles.actionsRow}>
            <button type="submit" className={styles.primaryButton} disabled={actionLoading}>Salvar segurança</button>
          </div>
        </form>
      );
    }

    return renderTwoStepPanel();
  };

  const onGenerateDeposit = async () => {
    const sessionUserId = userId || resolveSessionUserId();

    if (!sessionUserId) {
      setDepositError("Sessão não encontrada. Faça login novamente.");
      setDepositMessage("");
      return;
    }

    const valor = parseAmountInput(depositValue);

    if (valor <= 0) {
      setDepositError("Informe um valor válido para gerar o depósito.");
      setDepositMessage("");
      return;
    }

    try {
      setActionLoading(true);
      setDepositError("");
      setDepositMessage("");
      setDepositData(null);
      setDepositQrImage("");
      setDepositMonitoring(false);
      setDepositCountdownLabel("05:00");
      setDepositDeadlineAt(0);
      depositRedirectedRef.current = false;

      const response = await fetch("/api/pix/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ userId: sessionUserId, valor })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível gerar o depósito PIX.");
      }

      setDepositData(data);
      setDepositQrImage(await resolveDepositQrImage(data));
      setDepositMessage("Depósito PIX gerado com sucesso.");
      setDepositDeadlineAt(Date.now() + PIX_QR_TTL_MS);
      setDepositMonitoring(true);
      setUserId(sessionUserId);
    } catch (error) {
      setDepositError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={`${styles.card} ${pageKey === "meu-perfil" ? styles.cardWide : ""}`}>
        <p className={styles.kicker}>Conta Fire X1</p>
        <h1>{page.title}</h1>
        <p className={styles.description}>{page.description}</p>

        {pageKey === "meu-perfil" ? (
          <>
            {state.loading ? <p className={styles.infoMessage}>Carregando dados do cadastro...</p> : null}
            {state.error ? <p className={styles.errorMessage}>{state.error}</p> : null}

            {!state.loading && !state.error ? (
              <div className={styles.profileLayout}>
                <nav className={styles.tabRow} aria-label="Abas de perfil">
                  <button
                    type="button"
                    className={`${styles.tabButton} ${activeTab === "editar-perfil" ? styles.tabButtonActive : ""}`}
                    onClick={() => setActiveTab("editar-perfil")}
                  >
                    Editar perfil
                  </button>
                  <button
                    type="button"
                    className={`${styles.tabButton} ${activeTab === "mudar-senha" ? styles.tabButtonActive : ""}`}
                    onClick={() => setActiveTab("mudar-senha")}
                  >
                    Mudar senha
                  </button>
                  <button
                    type="button"
                    className={`${styles.tabButton} ${activeTab === "seguranca-acesso" ? styles.tabButtonActive : ""}`}
                    onClick={() => setActiveTab("seguranca-acesso")}
                  >
                    Segurança de acesso
                  </button>
                  <button
                    type="button"
                    className={`${styles.tabButton} ${activeTab === "verificacao-2-etapas" ? styles.tabButtonActive : ""}`}
                    onClick={() => setActiveTab("verificacao-2-etapas")}
                  >
                    Verificação em 2 etapas
                  </button>
                </nav>

                {renderTabContent()}
              </div>
            ) : null}
          </>
        ) : null}

        {pageKey === "adicionar-fundo" ? (
          <div className={styles.actions}>
            <label className={styles.fieldGroup}>
              <span>Valor do depósito (R$)</span>
              <input
                value={depositValue}
                onChange={(event) => {
                  setDepositValue(event.target.value);
                  setDepositError("");
                  setDepositMessage("");
                }}
                placeholder="20,00"
                inputMode="decimal"
              />
            </label>

            <button
              type="button"
              className={styles.primaryButton}
              onClick={onGenerateDeposit}
              disabled={actionLoading}
            >
              {actionLoading ? "Gerando..." : page.action}
            </button>
            <Link href="/dashboard" className={styles.secondaryLink}>Voltar ao dashboard</Link>

            {depositError ? <p className={styles.errorMessage}>{depositError}</p> : null}
            {depositMessage ? <p className={styles.successMessage}>{depositMessage}</p> : null}

            {depositData ? (
              <div className={styles.tabPanelForm}>
                <p className={styles.tabHelper}>Use o QR Code ou copie o código Pix para concluir o pagamento.</p>
                <p className={styles.infoMessage}>
                  Tempo restante nesta tela: <strong>{depositCountdownLabel}</strong>
                  {depositMonitoring ? " (aguardando confirmação de pagamento)" : ""}
                </p>
                {depositQrImage ? (
                  <div className={styles.qrCodeCard}>
                    <img className={styles.qrCodeImage} src={depositQrImage} alt="QR Code Pix" />
                  </div>
                ) : null}
                <label className={styles.fieldGroup}>
                  <span>Código Pix</span>
                  <input value={depositData.brCode || ""} readOnly />
                </label>
              </div>
            ) : null}
          </div>
        ) : null}

        {pageKey !== "meu-perfil" && pageKey !== "adicionar-fundo" ? (
          <div className={styles.actions}>
            <button type="button" className={styles.primaryButton}>{page.action}</button>
            <Link href="/dashboard" className={styles.secondaryLink}>Voltar ao dashboard</Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
