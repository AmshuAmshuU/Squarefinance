// Meta requires every WhatsApp Business Platform app to have a webhook
// configured before it'll let you finish production setup, even though we
// only need to SEND messages (the "Send link to customer" button), not
// receive them. verifyWebhook handles Meta's one-time verification
// handshake; receiveWebhook just acknowledges incoming events (delivery
// status, replies) so Meta doesn't retry/disable the webhook - we don't
// currently act on any of that.
const verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

const receiveWebhook = (req, res) => {
  res.sendStatus(200);
};

module.exports = { verifyWebhook, receiveWebhook };
