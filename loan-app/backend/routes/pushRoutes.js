const express = require("express");
const router = express.Router();
const pushController = require("../controllers/pushController");
const { isAuthenticated } = require("../middlewares/auth");

router.use(isAuthenticated);

router.get("/public-key", pushController.getPublicKey);
router.get("/status", pushController.getStatus);
router.post("/subscribe", pushController.subscribe);
router.post("/unsubscribe", pushController.unsubscribe);

module.exports = router;
