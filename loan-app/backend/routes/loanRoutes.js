const express = require("express");
const router = express.Router();
const {
  createLoan,
  getAllLoans,
  getLoanByLoanNumber,
  getLoanById,
  updateLoan,
  toggleSeizedStatus,
  calculateEMIApi,
  getPendingPayments,
  getFollowupLoans,
  getPendingEmiDetails,
  updatePaymentStatus,
  getForeclosureLoans,
  forecloseLoan,
  getSeizedVehicles,
  updateSeizedStatus,
  updateFollowup,
  getFollowupHistory,
  getTodoList,
  deleteLoan,
  checkLoanNumberUniqueness,
} = require("../controllers/loanController");
const {
  getRtoWorks,
  createRtoWork,
} = require("../controllers/rtoWorkController");
const { getExpiredDocLoans } = require("../controllers/expiredController");
const {
  isAuthenticated,
  authorizeRoles,
  authorizePermissions,
} = require("../middlewares/auth");

router.get("/health", (req, res) =>
  res.json({ status: "ok", version: "v5-cors-debugging" }),
);
router.get("/check-uniqueness/:loanNumber", checkLoanNumberUniqueness);
router.get("/test-uniqueness", (req, res) => res.json({ message: "Uniqueness route group is accessible" }));
router.get("/todo-list", getTodoList);
router.get("/expired-docs", getExpiredDocLoans);

router.use(isAuthenticated);

router.get("/rto-works", getRtoWorks);
router.post("/rto-works", createRtoWork);

router
  .route("/")
  .get(getAllLoans)
  .post(authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"), authorizePermissions("loans.create"), createLoan);

router.post("/calculate-emi", calculateEMIApi);
router.get(
  "/pending-payments",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  getPendingPayments,
);
router.get("/followups", getFollowupLoans);
router.get("/foreclosure", getForeclosureLoans);
router.get("/seized-vehicles", getSeizedVehicles);
router.patch(
  "/seized-vehicles/:id/status",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  authorizePermissions("loans.edit"),
  updateSeizedStatus,
);
router.get(
  "/pending-details/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  getPendingEmiDetails,
);
router.patch(
  "/:id/payment-status",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  authorizePermissions("loans.edit"),
  updatePaymentStatus,
);

router.patch(
  "/update-followup/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  authorizePermissions("loans.edit"),
  updateFollowup,
);

router.get(
  "/followup-history/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  authorizePermissions("loans.view"),
  getFollowupHistory,
);

router.get("/search/:loanNumber", getLoanByLoanNumber);
router.post(
  "/:id/foreclose",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  authorizePermissions("loans.create"),
  forecloseLoan,
);

router
  .route("/:id")
  .get(getLoanById)
  .put(
    authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
    authorizePermissions("loans.edit"),
    updateLoan,
  )
  .delete(authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"), authorizePermissions("loans.delete"), deleteLoan);

router.patch(
  "/:id/seized",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  authorizePermissions("loans.edit"),
  toggleSeizedStatus,
);

module.exports = router;
