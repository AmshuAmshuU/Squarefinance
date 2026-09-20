const express = require("express");
const router = express.Router();
const {
  getCollectionReport,
  getCollectionTransactions,
  getLoansGivenSummary,
  getCollectionsBreakdown,
} = require("../controllers/collectionController");
const { isAuthenticated, authorizeRoles } = require("../middlewares/auth");

router.use(isAuthenticated);

router.get("/report", getCollectionReport);
router.get("/transactions", getCollectionTransactions);
router.get("/loans-given", getLoansGivenSummary);

// Super Admin / Admin only - see collectionController.js getCollectionsBreakdown
// for why (Karthik 2026-09-20: staff should never see profit or the
// category makeup behind a collection total).
router.get("/breakdown", authorizeRoles("SUPER_ADMIN", "ADMIN"), getCollectionsBreakdown);

module.exports = router;
