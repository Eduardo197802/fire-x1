const bindModal = (modalId, openButtonId, closeButtonId, onOpen) => {
  const modal = document.getElementById(modalId);
  const openButton = document.getElementById(openButtonId);
  const closeButton = document.getElementById(closeButtonId);

  if (!modal || !openButton || !closeButton) return;

  const open = () => {
    modal.style.display = "flex";
    if (typeof onOpen === "function") onOpen();
  };

  const close = () => {
    modal.style.display = "none";
  };

  openButton.addEventListener("click", open);
  closeButton.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
};

// ========== Validações e utilitários de cadastro ==========
const onlyDigits = (value) => value.replace(/\D/g, "");

const validDdds = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "21", "22", "24", "27", "28",
  "31", "32", "33", "34", "35", "37", "38",
  "41", "42", "43", "44", "45", "46",
  "47", "48", "49",
  "51", "53", "54", "55",
  "61", "62", "63", "64", "65", "66", "67", "68", "69",
  "71", "73", "74", "75", "77", "79",
  "81", "82", "83", "84", "85", "86", "87", "88", "89",
  "91", "92", "93", "94", "95", "96", "97", "98", "99"
]);

const disposableEmailDomains = new Set([
  "10minutemail.com", "dispostable.com", "emailondeck.com", "fakeinbox.com",
  "guerrillamail.com", "maildrop.cc", "mailinator.com", "sharklasers.com",
  "temp-mail.org", "tempmail.com", "throwawaymail.com", "yopmail.com"
]);

const isValidCpf = (value) => {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let firstDigit = (sum * 10) % 11;
  firstDigit = firstDigit === 10 ? 0 : firstDigit;
  if (firstDigit !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  let secondDigit = (sum * 10) % 11;
  secondDigit = secondDigit === 10 ? 0 : secondDigit;
  return secondDigit === Number(cpf[10]);
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim().toLowerCase());
const isDisposableEmail = (value) => {
  const normalizedEmail = String(value || "").trim().toLowerCase();
  const domain = normalizedEmail.split("@")[1] || "";
  return disposableEmailDomains.has(domain);
};

const getBirthDate = (dateString) => {
  const birthDate = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(birthDate.getTime()) ? null : birthDate;
};

const isFutureBirthDate = (dateString) => {
  const birthDate = getBirthDate(dateString);
  if (!birthDate) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return birthDate > today;
};

const isAdult = (dateString) => {
  const birthDate = getBirthDate(dateString);
  if (!birthDate) return false;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age >= 18;
};

const isValidCellphone = (value) => {
  const digits = onlyDigits(value);
  if (digits.length !== 11) return false;
  const ddd = digits.slice(0, 2);
  const ninthDigit = digits[2];
  if (!validDdds.has(ddd) || ninthDigit !== "9") return false;
  return !/^(\d)\1{8}$/.test(digits.slice(2));
};

const formatCpf = (value) => {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

const formatPhone = (value) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
};

// ========== Modal de cadastro ==========
const cadastroForm = document.getElementById("cadastroForm");
const formMessage = document.getElementById("formMessage");
const cpfInput = document.getElementById("cpf");
const celularInput = document.getElementById("celular");
const confirmacaoFormModal = document.getElementById("confirmacaoFormModal");
const codigoConfirmacaoModal = document.getElementById("codigoConfirmacaoModal");
const confirmacaoModalMessage = document.getElementById("confirmacaoModalMessage");
const confirmacaoDestino = document.getElementById("confirmacaoDestino");
const confirmacaoPreview = document.getElementById("confirmacaoPreview");
const btnReenviarCodigoModal = document.getElementById("btnReenviarCodigoModal");

const showMessage = (message, type) => {
  if (!formMessage) return;
  formMessage.textContent = message;
  formMessage.className = `form-message ${type}`;
};

const getVerificationState = () => {
  try {
    return JSON.parse(sessionStorage.getItem("firex1Verification") || "null");
  } catch {
    return null;
  }
};

let verificationState = getVerificationState();

const showConfirmacaoMessage = (message, type) => {
  if (!confirmacaoModalMessage) return;
  confirmacaoModalMessage.textContent = message;
  confirmacaoModalMessage.className = `form-message ${type}`;
};

const updateConfirmacaoDestination = () => {
  verificationState = getVerificationState();
  const channel = verificationState?.channel === "sms" ? "SMS" : "e-mail";
  const destination = verificationState?.destination || "seu contato cadastrado";

  if (confirmacaoDestino) {
    confirmacaoDestino.textContent = `Enviamos um código por ${channel} para ${destination}.`;
  }

  if (confirmacaoPreview) {
    confirmacaoPreview.textContent = verificationState?.previewCode
      ? `Ambiente local: código de teste ${verificationState.previewCode}`
      : "";
  }
};

const openConfirmacaoModal = () => {
  updateConfirmacaoDestination();
  if (codigoConfirmacaoModal) {
    codigoConfirmacaoModal.value = "";
  }
  showConfirmacaoMessage("", "");
  closeModal("modalCadastroConta");
  openModal("modalConfirmacaoConta");
};

bindModal("modalSobre", "btnSobre", "btnFecharModalSobre");
bindModal("modalRegras", "btnRegras", "btnFecharModalRegras");
bindModal("modalTermos", "btnTermos", "btnFecharModalTermos");
bindModal("modalPolitica", "btnPolitica", "btnFecharModalPolitica");
bindModal("modalCadastroConta", "btnCadastrar", "btnFecharModalCadastroConta", () => {
  if (cadastroForm) {
    cadastroForm.reset();
  }
  showMessage("", "");
});

// ========== Login Modal ==========
const loginMessage = document.getElementById("loginMessage");
const recuperarMessage = document.getElementById("recuperarMessage");

const showLoginMessage = (msg, type) => {
  if (!loginMessage) return;
  loginMessage.textContent = msg;
  loginMessage.className = "form-message " + type;
};

const showRecuperarMessage = (msg, type) => {
  if (!recuperarMessage) return;
  recuperarMessage.textContent = msg;
  recuperarMessage.className = "form-message " + type;
};

const openModal = (id) => { const m = document.getElementById(id); if (m) m.style.display = "flex"; };
const closeModal = (id) => { const m = document.getElementById(id); if (m) m.style.display = "none"; };

bindModal("modalLogin", "btnEntrar", "btnFecharModalLogin", () => {
  const f = document.getElementById("loginForm");
  if (f) f.reset();
  showLoginMessage("", "");
});

const btnEsqueceuSenha = document.getElementById("btnEsqueceuSenha");
if (btnEsqueceuSenha) {
  btnEsqueceuSenha.addEventListener("click", () => {
    closeModal("modalLogin");
    const f = document.getElementById("recuperarForm");
    if (f) f.reset();
    showRecuperarMessage("", "");
    openModal("modalRecuperarSenha");
  });
}

const btnIrCadastro = document.getElementById("btnIrCadastro");
if (btnIrCadastro) {
  btnIrCadastro.addEventListener("click", () => {
    closeModal("modalLogin");
    openModal("modalCadastroConta");
  });
}

const btnVoltarLogin = document.getElementById("btnVoltarLogin");
if (btnVoltarLogin) {
  btnVoltarLogin.addEventListener("click", () => {
    closeModal("modalRecuperarSenha");
    openModal("modalLogin");
  });
}

const btnFecharRecuperar = document.getElementById("btnFecharModalRecuperarSenha");
if (btnFecharRecuperar) {
  btnFecharRecuperar.addEventListener("click", () => closeModal("modalRecuperarSenha"));
}

const btnFecharConfirmacao = document.getElementById("btnFecharModalConfirmacaoConta");
if (btnFecharConfirmacao) {
  btnFecharConfirmacao.addEventListener("click", () => closeModal("modalConfirmacaoConta"));
}

const btnEntrarCadastro = document.getElementById("btnEntrarCadastro");
if (btnEntrarCadastro) {
  btnEntrarCadastro.addEventListener("click", () => {
    closeModal("modalCadastroConta");
    openModal("modalLogin");
  });
}

const btnAbrirConfirmacao = document.getElementById("btnAbrirConfirmacao");
if (btnAbrirConfirmacao) {
  btnAbrirConfirmacao.addEventListener("click", () => {
    if (!getVerificationState()?.userId) {
      showMessage("Conclua o cadastro primeiro para receber um código de confirmação.", "error");
      return;
    }
    openConfirmacaoModal();
  });
}

const btnVoltarCadastro = document.getElementById("btnVoltarCadastro");
if (btnVoltarCadastro) {
  btnVoltarCadastro.addEventListener("click", () => {
    closeModal("modalConfirmacaoConta");
    openModal("modalCadastroConta");
  });
}

const btnIrLoginConfirmacao = document.getElementById("btnIrLoginConfirmacao");
if (btnIrLoginConfirmacao) {
  btnIrLoginConfirmacao.addEventListener("click", () => {
    closeModal("modalConfirmacaoConta");
    openModal("modalLogin");
  });
}

window.addEventListener("click", (e) => {
  const mLogin = document.getElementById("modalLogin");
  const mRecuperar = document.getElementById("modalRecuperarSenha");
  const mConfirmacao = document.getElementById("modalConfirmacaoConta");
  if (mLogin && e.target === mLogin) mLogin.style.display = "none";
  if (mRecuperar && e.target === mRecuperar) mRecuperar.style.display = "none";
  if (mConfirmacao && e.target === mConfirmacao) mConfirmacao.style.display = "none";
});

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector("button[type='submit']");
    const email = document.getElementById("loginEmail").value.trim();
    const senha = document.getElementById("loginSenha").value;
    if (!email || !senha) { showLoginMessage("Preencha e-mail e senha.", "error"); return; }
    btn.disabled = true;
    showLoginMessage("Entrando...", "info");
    try {
      const res = await fetch("/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao entrar.");
      localStorage.setItem("firex1:user", JSON.stringify(data));
      showLoginMessage("Acesso realizado com sucesso!", "success");
      window.setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    } catch (err) {
      showLoginMessage(err.message, "error");
    } finally {
      btn.disabled = false;
    }
  });
}

const recuperarForm = document.getElementById("recuperarForm");
if (recuperarForm) {
  recuperarForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = recuperarForm.querySelector("button[type='submit']");
    const email = document.getElementById("recuperarEmail").value.trim();
    if (!email) { showRecuperarMessage("Informe seu e-mail.", "error"); return; }
    btn.disabled = true;
    showRecuperarMessage("Enviando...", "info");
    try {
      const res = await fetch("/user/recuperar-senha/solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao solicitar.");
      showRecuperarMessage("Se esse e-mail estiver cadastrado, você receberá as instruções.", "success");
    } catch (err) {
      showRecuperarMessage(err.message, "error");
    } finally {
      btn.disabled = false;
    }
  });
}

if (codigoConfirmacaoModal) {
  codigoConfirmacaoModal.addEventListener("input", (event) => {
    event.target.value = String(event.target.value || "").replace(/\D/g, "").slice(0, 6);
  });
}

if (confirmacaoFormModal) {
  confirmacaoFormModal.addEventListener("submit", async (event) => {
    event.preventDefault();
    verificationState = getVerificationState();

    if (!verificationState?.userId) {
      showConfirmacaoMessage("Sessão de confirmação inválida. Refaça o cadastro.", "error");
      return;
    }

    const submitButton = confirmacaoFormModal.querySelector("button[type='submit']");
    const codigo = String(codigoConfirmacaoModal?.value || "").replace(/\D/g, "");

    if (codigo.length !== 6) {
      showConfirmacaoMessage("Digite o código de 6 números.", "error");
      return;
    }

    submitButton.disabled = true;
    if (btnReenviarCodigoModal) btnReenviarCodigoModal.disabled = true;
    showConfirmacaoMessage("Validando código...", "success");

    try {
      const response = await fetch("/user/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: verificationState.userId, codigo })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível validar o código.");
      }

      sessionStorage.removeItem("firex1Verification");
      showConfirmacaoMessage("Conta confirmada com sucesso. Agora você já pode entrar.", "success");

      setTimeout(() => {
        closeModal("modalConfirmacaoConta");
        openModal("modalLogin");
        showLoginMessage("Conta confirmada. Faça login para continuar.", "success");
      }, 1200);
    } catch (error) {
      showConfirmacaoMessage(error.message || "Erro ao confirmar o código.", "error");
    } finally {
      submitButton.disabled = false;
      if (btnReenviarCodigoModal) btnReenviarCodigoModal.disabled = false;
    }
  });
}

if (btnReenviarCodigoModal) {
  btnReenviarCodigoModal.addEventListener("click", async () => {
    verificationState = getVerificationState();

    if (!verificationState?.userId) {
      showConfirmacaoMessage("Sessão de confirmação inválida. Refaça o cadastro.", "error");
      return;
    }

    btnReenviarCodigoModal.disabled = true;
    showConfirmacaoMessage("Reenviando código...", "success");

    try {
      const response = await fetch("/user/reenviar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: verificationState.userId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível reenviar o código.");
      }

      sessionStorage.setItem("firex1Verification", JSON.stringify({
        userId: verificationState.userId,
        channel: data.verificationChannel,
        destination: data.maskedDestination,
        previewCode: data.previewCode || ""
      }));

      updateConfirmacaoDestination();
      showConfirmacaoMessage("Novo código enviado com sucesso.", "success");
    } catch (error) {
      showConfirmacaoMessage(error.message || "Erro ao reenviar o código.", "error");
    } finally {
      btnReenviarCodigoModal.disabled = false;
    }
  });
}

if (cpfInput) {
  cpfInput.addEventListener("input", (event) => {
    event.target.value = formatCpf(event.target.value);
  });
}

if (celularInput) {
  celularInput.addEventListener("input", (event) => {
    event.target.value = formatPhone(event.target.value);
  });
}

if (cadastroForm) {
  cadastroForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = cadastroForm.querySelector("button[type='submit']");
  const formData = new FormData(cadastroForm);

  const payload = {
    nome: String(formData.get("nome") || "").trim(),
    cpf: onlyDigits(String(formData.get("cpf") || "")),
    dataNascimento: String(formData.get("dataNascimento") || ""),
    email: String(formData.get("email") || "").trim(),
    celular: onlyDigits(String(formData.get("celular") || "")),
    canalVerificacao: String(formData.get("canalVerificacao") || "email").trim().toLowerCase(),
    senha: String(formData.get("senha") || ""),
    confirmarSenha: String(formData.get("confirmarSenha") || ""),
    maiorIdade: formData.get("maiorIdade") === "on",
    aceiteTermos: formData.get("aceiteTermos") === "on"
  };

  if (!payload.nome || !payload.cpf || !payload.dataNascimento || !payload.email || !payload.celular || !payload.senha) {
    showMessage("Preencha todos os campos obrigatórios.", "error");
    return;
  }

  if (payload.cpf.length !== 11) {
    showMessage("Informe um CPF válido com 11 dígitos.", "error");
    return;
  }

  if (!isValidCpf(payload.cpf)) {
    showMessage("Informe um CPF válido.", "error");
    return;
  }

  if (!isValidEmail(payload.email)) {
    showMessage("Informe um e-mail válido.", "error");
    return;
  }

  if (isDisposableEmail(payload.email)) {
    showMessage("Use um e-mail permanente para criar sua conta.", "error");
    return;
  }

  if (!isValidCellphone(payload.celular)) {
    showMessage("Informe um celular válido com DDD brasileiro.", "error");
    return;
  }

  if (isFutureBirthDate(payload.dataNascimento)) {
    showMessage("A data de nascimento não pode estar no futuro.", "error");
    return;
  }

  if (!isAdult(payload.dataNascimento) || !payload.maiorIdade) {
    showMessage("O cadastro é permitido apenas para maiores de 18 anos.", "error");
    return;
  }

  if (payload.senha.length < 8) {
    showMessage("A senha deve ter no mínimo 8 caracteres.", "error");
    return;
  }

  if (payload.senha !== payload.confirmarSenha) {
    showMessage("A confirmação da senha não confere.", "error");
    return;
  }

  if (!payload.aceiteTermos) {
    showMessage("Você precisa aceitar os termos para continuar.", "error");
    return;
  }

  if (payload.canalVerificacao !== "email") {
    showMessage("No momento, a confirmação está disponível apenas por e-mail.", "error");
    return;
  }

  submitButton.disabled = true;
  showMessage("Criando sua conta...", "success");

  try {
    const response = await fetch("/user/criar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Não foi possível concluir o cadastro.");
    }

    sessionStorage.setItem("firex1Verification", JSON.stringify({
      userId: data.id,
      channel: data.verificationChannel,
      destination: data.maskedDestination,
      previewCode: data.previewCode || ""
    }));

    showMessage("Conta criada. Confirme o código para liberar o acesso.", "success");
    openConfirmacaoModal();
  } catch (error) {
    showMessage(error.message || "Erro ao enviar cadastro.", "error");
  } finally {
    submitButton.disabled = false;
  }
  });
}