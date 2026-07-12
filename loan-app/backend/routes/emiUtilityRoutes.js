const express = require("express");
const {
  generateEMIsForExistingLoans,
} = require("../controllers/emiUtilityController");
const { isAuthenticated } = require("../middlewares/auth");
const authorizeRoles = require("../middlewares/role");

const router = express.Router();

router.use(isAuthenticated);

// Utility route to generate EMIs for existing loans
router.post(
  "/generate-emis",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  generateEMIsForExistingLoans,
);

module.exports = router;
