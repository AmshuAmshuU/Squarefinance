const express = require("express");
const router = express.Router();
const {
  getCollectionReport,
  getCollectionTransactions,
  getLoansGivenSummary,
} = require("../controllers/collectionController");
const { isAuthenticated } = require("../middlewares/auth");

router.use(isAuthenticated);

router.get("/report", getCollectionReport);
router.get("/transactions", getCollectionTransactions);
router.get("/loans-given", getLoansGivenSummary);

module.exports = router;
