const express = require("express");
const {
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const router = express.Router();

router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
