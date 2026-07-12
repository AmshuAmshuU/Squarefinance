const express = require("express");
const router = express.Router();
const { getPendingApprovals, processApproval } = require("../controllers/approvalController");
const { isAuthenticated, authorizeRoles } = require("../middlewares/auth");

router.use(isAuthenticated);
router.use(authorizeRoles("SUPER_ADMIN")); // Only Super Admins can see/process approvals

router.get("/pending", getPendingApprovals);
router.post("/process/:id", processApproval);

module.exports = router;
