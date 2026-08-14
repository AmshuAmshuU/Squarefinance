// Sends the "loan_update" WhatsApp message template via Meta's WhatsApp
// Cloud API. Reads WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN from
// env (set on Render 2026-08-14). Business-initiated messages (a cold
// message to a customer who hasn't messaged first) can ONLY be sent as an
// approved template, not freeform text - Meta accepts a freeform "text"
// send with a 200 OK but silently never delivers it, which is why the
// first version of this function looked like it worked but nothing ever
// arrived. Template body (approved, do not edit without resubmitting for
// review): "Your Square finance loan is pending. Please click the
// following link to check your loan status: {{1}}\n\n- Square Finance"
const sendLocationLinkMessage = async (toPhoneNumber, link) => {
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
      type: "template",
      template: {
        name: "loan_update",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: link }],
          },
        ],
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to send WhatsApp message");
  }
  return data;
};

module.exports = { sendLocationLinkMessage };
