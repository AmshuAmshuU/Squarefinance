const express = require("express");
const router = express.Router();
const {
  getCollectionReport,
  getCollectionTransactions,
  getLoansGivenSummary,
  getCollectionsBreakdown,
  getLoansGivenBreakdown,
} = require("../controllers/collectionController");
const { isAuthenticated } = require("../middlewares/auth");

router.use(isAuthenticated);

router.get("/report", getCollectionReport);
router.get("/transactions", getCollectionTransactions);
router.get("/loans-given", getLoansGivenSummary);

// Originally Super Admin/Admin only, restricted because the breakdown also
// showed profit - opened to all authenticated roles 2026-09-20 once profit
// was removed (see collectionController.js getCollectionsBreakdown). What's
// left is just a by-type split of the same total every role already sees.
router.get("/breakdown", getCollectionsBreakdown);

// Open to all roles - see getLoansGivenBreakdown in collectionController.js
router.get("/loans-given-breakdown", getLoansGivenBreakdown);

module.exports = router;
