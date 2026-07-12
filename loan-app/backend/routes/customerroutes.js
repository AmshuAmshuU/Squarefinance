const express = require("express");
const {
  createCustomerLoan,
  getAllCustomers,
  getCustomerByLoanNumber,
  updateCustomer,
  updateEMI,
  getAllEMIDetails,
  getEMIsByLoanId,
} = require("../controllers/customercontroller");
const {
  isAuthenticated,
  authorizeRoles,
  authorizePermissions,
} = require("../middlewares/auth");

const router = express.Router();

router.use(isAuthenticated);

router.post("/", authorizeRoles("SUPER_ADMIN", "ADMIN"), createCustomerLoan);
router.get(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  getAllCustomers,
);
router.get(
  "/emis/all",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  getAllEMIDetails,
);
router.get(
  "/loan-emis/:loanId",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  getEMIsByLoanId,
);
router.get(
  "/:loanNumber",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  getCustomerByLoanNumber,
);

router.put("/:id", authorizeRoles("SUPER_ADMIN", "ADMIN"), updateCustomer);
router.put(
  "/emi/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  authorizePermissions("emis.edit"),
  updateEMI,
);

module.exports = router;
