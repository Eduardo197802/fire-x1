const toBool = (value) => String(value || "").trim().toLowerCase() === "true";

export const isWhatsAppConfigured = () =>
  String(process.env.WHATSAPP_PROVIDER || "").toLowerCase() === "meta-cloud" &&
  Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID) &&
  Boolean(process.env.WHATSAPP_ACCESS_TOKEN);

export async function sendWhatsAppTemplate({ to, template, variables = [] }) {
  const normalizedTo = String(to || "").replace(/\D/g, "");
  if (!normalizedTo) throw new Error("Destino WhatsApp invalido.");

  if (!isWhatsAppConfigured()) {
    if (process.env.NODE_ENV !== "production" || toBool(process.env.WHATSAPP_MOCK_MODE)) {
      console.log(`[WhatsApp mock] template=${template} to=${normalizedTo} vars=${variables.join(",")}`);
      return { mocked: true };
    }
    throw new Error("WhatsApp Business nao configurado.");
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizedTo,
      type: "template",
      template: {
        name: template,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "pt_BR" },
        components: variables.length
          ? [{
              type: "body",
              parameters: variables.map((text) => ({ type: "text", text: String(text) })),
            }]
          : undefined,
      },
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error?.message || "Falha ao enviar WhatsApp.");
  }
  return body;
}

export const sendPasswordRecoveryWhatsApp = ({ to, code }) =>
  sendWhatsAppTemplate({
    to,
    template: process.env.WHATSAPP_TEMPLATE_RECUPERACAO || "recuperacao_senha",
    variables: [code, "15"],
  });
