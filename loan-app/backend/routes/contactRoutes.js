const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contactController");

router.post("/inquiry", contactController.sendInquiry);

module.exports = router;
