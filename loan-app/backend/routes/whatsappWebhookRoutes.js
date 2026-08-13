const express = require("express");
const router = express.Router();
const { verifyWebhook, receiveWebhook } = require("../controllers/whatsappWebhookController");

// Public - Meta calls these directly, no auth. GET is the one-time
// verification handshake, POST is where actual events would arrive.
router.get("/", verifyWebhook);
router.post("/", receiveWebhook);

module.exports = router;
