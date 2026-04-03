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

const showMessage = (message, type) => {
  if (!formMessage) return;
  formMessage.textContent = message;
  formMessage.className = `form-message ${type}`;
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

    window.location.href = `/confirmacao?user=${encodeURIComponent(data.id)}`;
  } catch (error) {
    showMessage(error.message || "Erro ao enviar cadastro.", "error");
  } finally {
    submitButton.disabled = false;
  }
  });
}