// Sends a WhatsApp message via Meta's WhatsApp Cloud API. Reads
// WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN from env - not set as
// of 2026-08-13, waiting on Karthik's Meta Business account confirmation.
// Until those are added to backend/.env (and Render's env for production),
// this throws a clear, specific error rather than failing silently.
const sendWhatsAppMessage = async (toPhoneNumber, message) => {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error(
      "WhatsApp isn't connected yet - add WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN once the Meta Business account is confirmed."
    );
  }

  const digitsOnly = String(toPhoneNumber || "").replace(/\D/g, "");
  // Meta requires the country code - assume India (91) for a bare 10-digit
  // number, the shape every mobileNumbers entry in this app is stored as.
  const to = digitsOnly.length === 10 ? `91${digitsOnly}` : digitsOnly;

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to send WhatsApp message");
  }
  return data;
};

module.exports = { sendWhatsAppMessage };
