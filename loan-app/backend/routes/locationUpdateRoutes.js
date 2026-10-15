const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/auth");
const {
  getUnseen,
  getUpdates,
  markSeen,
  markAllSeen,
  getLoanHistory,
} = require("../controllers/locationUpdateController");

// Every logged-in person (any role) can see customer location updates and
// each loan's location history - per-person "seen" state is kept on the update.
router.get("/", isAuthenticated, getUpdates);
router.get("/unseen", isAuthenticated, getUnseen);
router.post("/seen-all", isAuthenticated, markAllSeen);
router.get("/loan/:loanModel/:loanId", isAuthenticated, getLoanHistory);
router.post("/:id/seen", isAuthenticated, markSeen);

module.exports = router;
