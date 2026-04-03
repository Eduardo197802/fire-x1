const confirmacaoForm = document.getElementById("confirmacaoForm");
const codigoInput = document.getElementById("codigo");
const confirmacaoMessage = document.getElementById("confirmacaoMessage");
const destinationText = document.getElementById("destinationText");
const previewText = document.getElementById("previewText");
const btnReenviarCodigo = document.getElementById("btnReenviarCodigo");

const query = new URLSearchParams(window.location.search);
const userIdFromQuery = query.get("user") || "";

let verificationState = null;

try {
  verificationState = JSON.parse(sessionStorage.getItem("firex1Verification") || "null");
} catch {
  verificationState = null;
}

const userId = String(verificationState?.userId || userIdFromQuery || "");

const showMessage = (message, type) => {
  confirmacaoMessage.textContent = message;
  confirmacaoMessage.className = `form-message ${type}`;
};

const updateDestinationText = () => {
  const channel = verificationState?.channel === "sms" ? "SMS" : "e-mail";
  const destination = verificationState?.destination || "seu contato cadastrado";

  destinationText.textContent = `Enviamos um código por ${channel} para ${destination}.`;

  if (verificationState?.previewCode) {
    previewText.textContent = `Ambiente local: código de teste ${verificationState.previewCode}`;
  } else {
    previewText.textContent = "";
  }
};

codigoInput?.addEventListener("input", (event) => {
  event.target.value = String(event.target.value || "").replace(/\D/g, "").slice(0, 6);
});

updateDestinationText();

confirmacaoForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!userId) {
    showMessage("Sessão de confirmação inválida. Refaça o cadastro.", "error");
    return;
  }

  const submitButton = confirmacaoForm.querySelector("button[type='submit']");
  const codigo = String(codigoInput.value || "").replace(/\D/g, "");

  if (codigo.length !== 6) {
    showMessage("Digite o código de 6 números.", "error");
    return;
  }

  submitButton.disabled = true;
  btnReenviarCodigo.disabled = true;
  showMessage("Validando código...", "success");

  try {
    const response = await fetch("/user/verificar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userId, codigo })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Não foi possível validar o código.");
    }

    sessionStorage.removeItem("firex1Verification");
    showMessage("Conta confirmada com sucesso. O uso total já está liberado.", "success");
    setTimeout(() => {
      window.location.href = "/";
    }, 1800);
  } catch (error) {
    showMessage(error.message || "Erro ao confirmar o código.", "error");
  } finally {
    submitButton.disabled = false;
    btnReenviarCodigo.disabled = false;
  }
});

btnReenviarCodigo?.addEventListener("click", async () => {
  if (!userId) {
    showMessage("Sessão de confirmação inválida. Refaça o cadastro.", "error");
    return;
  }

  btnReenviarCodigo.disabled = true;
  showMessage("Reenviando código...", "success");

  try {
    const response = await fetch("/user/reenviar-codigo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userId })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Não foi possível reenviar o código.");
    }

    verificationState = {
      userId,
      channel: data.verificationChannel,
      destination: data.maskedDestination,
      previewCode: data.previewCode || ""
    };

    sessionStorage.setItem("firex1Verification", JSON.stringify(verificationState));
    updateDestinationText();
    showMessage("Novo código enviado com sucesso.", "success");
  } catch (error) {
    showMessage(error.message || "Erro ao reenviar o código.", "error");
  } finally {
    btnReenviarCodigo.disabled = false;
  }
});