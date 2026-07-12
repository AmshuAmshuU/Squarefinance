const express = require("express");
const router = express.Router();
const {
  createInterestLoan,
  getAllInterestLoans,
  getInterestLoanById,
  updateInterestLoan,
  deleteInterestLoan,
  addPrincipalPayment,
  payInterestEMI,
  getInterestPendingPayments,
  getInterestFollowupLoans,
  getInterestPendingEmiDetails,
} = require("../controllers/interestLoanController");
const { updateFollowup } = require("../controllers/loanController");
const { isAuthenticated, authorizeRoles } = require("../middlewares/auth");

router.use(isAuthenticated);

router.patch(
  "/update-followup/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  updateFollowup,
);

router.route("/")
  .get(getAllInterestLoans)
  .post(createInterestLoan);

router.route("/pending").get(getInterestPendingPayments);
router.route("/followup-payments").get(getInterestFollowupLoans);
router.get("/pending-details/:id", getInterestPendingEmiDetails);

router.route("/:id")
  .get(getInterestLoanById)
  .put(updateInterestLoan)
  .delete(authorizeRoles("SUPER_ADMIN"), deleteInterestLoan);

router.route("/:id/principal-payment").post(addPrincipalPayment);
router.route("/emi/:id/pay").put(payInterestEMI);

module.exports = router;
