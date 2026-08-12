const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/auth");
const {
  getLoanByLocationToken,
  updateLoanLocation,
  sendLocationLink,
} = require("../controllers/locationController");

// Staff-only - triggers the "Send link to customer" WhatsApp message.
router.post("/send/:loanModel/:loanId", isAuthenticated, sendLocationLink);

// Public - no isAuthenticated. Accessed directly by a customer's phone via
// a WhatsApp link, not by a logged-in staff member.
router.get("/:token", getLoanByLocationToken);
router.post("/:token", updateLoanLocation);

module.exports = router;
