const express = require("express");
const router = express.Router();
const loanEmiController = require("../controllers/loanEmiController");
const { isAuthenticated, authorizePermissions, authorizeRoles } = require("../middlewares/auth");

router.use(isAuthenticated);

router.get("/pending", loanEmiController.getPendingLoans);
router.get("/partial", loanEmiController.getPartialLoans);
router.get("/followups", loanEmiController.getFollowups);
router.put("/client-response/:loanId", authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"), authorizePermissions("emis.edit"), loanEmiController.updateClientResponse);
router.put("/complete-followup/:loanId", authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"), authorizePermissions("emis.edit"), loanEmiController.completeFollowup);

module.exports = router;
